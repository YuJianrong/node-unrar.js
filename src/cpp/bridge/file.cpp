#include "../unrar/rar.hpp"
#include <string>

extern "C"
{
  extern FileHandle jsOpen(const wchar *);
  extern FileHandle jsCreate(const wchar *);
  extern void jsClose(FileHandle);
  extern int jsRead(FileHandle, void *, size_t);
  extern bool jsWrite(FileHandle, const void *, size_t);
  extern int64 jsTell(FileHandle);
  extern bool jsSeek(FileHandle, int64, const char *);
}

File::File()
{
  hFile = FILE_BAD_HANDLE;
  *FileName = 0;
  NewFile = false;
  LastWrite = false;
  HandleType = FILE_HANDLENORMAL;
  SkipClose = false;
  ErrorType = FILE_SUCCESS;
  OpenShared = false;
  AllowDelete = true;
  AllowExceptions = true;
  PreserveAtime = false;
  ReadErrorMode = FREM_ASK;
  TruncatedAfterReadError = false;
}

File::~File()
{
  if (hFile != FILE_BAD_HANDLE && !SkipClose)
    if (NewFile)
      Delete();
    else
      Close();
}

void File::operator=(File &SrcFile)
{
  hFile = SrcFile.hFile;
  NewFile = SrcFile.NewFile;
  LastWrite = SrcFile.LastWrite;
  HandleType = SrcFile.HandleType;
  TruncatedAfterReadError = SrcFile.TruncatedAfterReadError;
  wcsncpyz(FileName, SrcFile.FileName, ASIZE(FileName));
  SrcFile.SkipClose = true;
}

bool File::Open(const wchar *Name, uint Mode)
{
  ErrorType = FILE_SUCCESS;
  FileHandle hNewFile;
  bool OpenShared = File::OpenShared || (Mode & FMF_OPENSHARED) != 0;
  bool UpdateMode = (Mode & FMF_UPDATE) != 0;
  bool WriteMode = (Mode & FMF_WRITE) != 0;
  int flags = UpdateMode ? O_RDWR : (WriteMode ? O_WRONLY : O_RDONLY);
  char NameA[NM];
  WideToChar(Name, NameA, ASIZE(NameA));

  // int handle=open(NameA,flags);
  // if (handle==-1)
  //   hNewFile=FILE_BAD_HANDLE;
  // else
  // {
  //   hNewFile=fdopen(handle,UpdateMode ? UPDATEBINARY:READBINARY);
  // }

  hNewFile = jsOpen(Name);

  if (hNewFile == FILE_BAD_HANDLE && errno == ENOENT)
    ErrorType = FILE_NOTFOUND;
  NewFile = false;
  HandleType = FILE_HANDLENORMAL;
  SkipClose = false;
  bool Success = hNewFile != FILE_BAD_HANDLE;
  if (Success)
  {
    hFile = hNewFile;
    wcsncpyz(FileName, Name, ASIZE(FileName));
    TruncatedAfterReadError = false;
  }
  return Success;
}

void File::TOpen(const wchar *Name)
{
  if (!WOpen(Name))
    ErrHandler.Exit(RARX_OPEN);
}

bool File::WOpen(const wchar *Name)
{
  if (Open(Name))
    return true;
  ErrHandler.OpenErrorMsg(Name);
  return false;
}

bool File::Create(const wchar *Name, uint Mode)
{
  // OpenIndiana based NAS and CIFS shares fail to set the file time if file
  // was created in read+write mode and some data was written and not flushed
  // before SetFileTime call. So we should use the write only mode if we plan
  // SetFileTime call and do not need to read from file.
  bool WriteMode = (Mode & FMF_WRITE) != 0;
  bool ShareRead = (Mode & FMF_SHAREREAD) != 0 || File::OpenShared;
  char NameA[NM];
  WideToChar(Name, NameA, ASIZE(NameA));
  // hFile=fopen(NameA,WriteMode ? WRITEBINARY:CREATEBINARY);
  hFile = jsCreate(Name);
  NewFile = true;
  HandleType = FILE_HANDLENORMAL;
  SkipClose = false;
  wcsncpyz(FileName, Name, ASIZE(FileName));
  return hFile != FILE_BAD_HANDLE;
}

void File::TCreate(const wchar *Name, uint Mode)
{
  if (!WCreate(Name, Mode))
    ErrHandler.Exit(RARX_FATAL);
}

bool File::WCreate(const wchar *Name, uint Mode)
{
  if (Create(Name, Mode))
    return true;
  ErrHandler.CreateErrorMsg(Name);
  return false;
}

bool File::Close()
{
  bool Success = true;

  if (hFile != FILE_BAD_HANDLE)
  {
    if (!SkipClose)
    {
      // Success=fclose(hFile)!=EOF;
      jsClose(hFile);
      Success = true;
    }
    hFile = FILE_BAD_HANDLE;
  }
  HandleType = FILE_HANDLENORMAL;
  if (!Success && AllowExceptions)
    ErrHandler.CloseError(FileName);
  return Success;
}

bool File::Delete()
{
  return false;
}

bool File::Rename(const wchar *NewName)
{
  // No need to rename if names are already same.
  return true;
}

bool File::Write(const void *Data, size_t Size)
{
  if (Size == 0)
    return true;
  // if (HandleType==FILE_HANDLESTD)
  // {
  //   // Cannot use the standard stdout here, because it already has wide orientation.
  //   if (hFile==FILE_BAD_HANDLE)
  //   {
  //     hFile=fdopen(dup(STDOUT_FILENO),"w"); // Open new stdout stream.
  //   }
  // }
  // bool Success;
  // while (1)
  // {
  //   Success=false;
  //   int Written=fwrite(Data,1,Size,hFile);
  //   Success=Written==Size && !ferror(hFile);
  //   if (!Success && AllowExceptions && HandleType==FILE_HANDLENORMAL)
  //   {
  //     if (ErrHandler.AskRepeatWrite(FileName,false))
  //     {
  //       if (Written<Size && Written>0)
  //         Seek(Tell()-Written,SEEK_SET);
  //       continue;
  //     }
  //     ErrHandler.WriteError(NULL,FileName);
  //   }
  //   break;
  // }
  bool Success = jsWrite(hFile, Data, Size);
  LastWrite = true;
  return Success; // It can return false only if AllowExceptions is disabled.
}

int File::Read(void *Data, size_t Size)
{
  if (TruncatedAfterReadError)
    return 0;

  int64 FilePos = 0; // Initialized only to suppress some compilers warning.

  if (ReadErrorMode == FREM_IGNORE)
    FilePos = Tell();
  int ReadSize;
  while (true)
  {
    ReadSize = DirectRead(Data, Size);
    if (ReadSize == -1)
    {
      ErrorType = FILE_READERROR;
      if (AllowExceptions)
        if (ReadErrorMode == FREM_IGNORE)
        {
          ReadSize = 0;
          for (size_t I = 0; I < Size; I += 512)
          {
            Seek(FilePos + I, SEEK_SET);
            size_t SizeToRead = Min(Size - I, 512);
            int ReadCode = DirectRead(Data, SizeToRead);
            ReadSize += (ReadCode == -1) ? 512 : ReadCode;
          }
        }
        else
        {
          bool Ignore = false, Retry = false, Quit = false;
          if (ReadErrorMode == FREM_ASK && HandleType == FILE_HANDLENORMAL)
          {
            ErrHandler.AskRepeatRead(FileName, Ignore, Retry, Quit);
            if (Retry)
              continue;
          }
          if (Ignore || ReadErrorMode == FREM_TRUNCATE)
          {
            TruncatedAfterReadError = true;
            return 0;
          }
          ErrHandler.ReadError(FileName);
        }
    }
    break;
  }
  return ReadSize; // It can return -1 only if AllowExceptions is disabled.
}

// Returns -1 in case of error.
int File::DirectRead(void *Data, size_t Size)
{
  if (LastWrite)
  {
    // fflush(hFile);
    LastWrite = false;
  }
  // clearerr(hFile);
  // size_t ReadSize=fread(Data,1,Size,hFile);
  // if (ferror(hFile))
  // return -1;
  // return (int)ReadSize;
  return jsRead(hFile, Data, Size);
}

void File::Seek(int64 Offset, int Method)
{
  if (!RawSeek(Offset, Method) && AllowExceptions)
    ErrHandler.SeekError(FileName);
}

bool File::RawSeek(int64 Offset, int Method)
{
  if (hFile == FILE_BAD_HANDLE)
    return true;
  if (Offset < 0 && Method != SEEK_SET)
  {
    Offset = (Method == SEEK_CUR ? Tell() : FileLength()) + Offset;
    Method = SEEK_SET;
  }
  LastWrite = false;
  return jsSeek(hFile, Offset, Method == SEEK_CUR ? "CUR" : Method == SEEK_SET ? "SET" : "END");
}

int64 File::Tell()
{
  if (hFile == FILE_BAD_HANDLE)
    if (AllowExceptions)
      ErrHandler.SeekError(FileName);
    else
      return -1;
  return jsTell(hFile);
}

void File::Prealloc(int64 Size)
{
}

byte File::GetByte()
{
  byte Byte = 0;
  Read(&Byte, 1);
  return Byte;
}

void File::PutByte(byte Byte)
{
  Write(&Byte, 1);
}

bool File::Truncate()
{
  return true;
}

void File::Flush()
{
}

void File::SetOpenFileTime(RarTime *ftm, RarTime *ftc, RarTime *fta)
{
}

void File::SetCloseFileTime(RarTime *ftm, RarTime *fta)
{
}

void File::SetCloseFileTimeByName(const wchar *Name, RarTime *ftm, RarTime *fta)
{
}

void File::GetOpenFileTime(RarTime *ft)
{
}

int64 File::FileLength()
{
  int64 SavePos = Tell();
  Seek(0, SEEK_END);
  int64 Length = Tell();
  Seek(SavePos, SEEK_SET);
  return Length;
}

bool File::IsDevice()
{
  return false;
}

int64 File::Copy(File &Dest, int64 Length)
{
  return 0;
}
