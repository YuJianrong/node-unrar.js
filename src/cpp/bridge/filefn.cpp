#include "../unrar/rar.hpp"

MKDIR_CODE MakeDir(const wchar *Name,bool SetAttr,uint Attr)
{
  return MKDIR_SUCCESS;
}


bool CreatePath(const wchar *Path,bool SkipLastName)
{
  bool Success=true;
  return Success;
}


void SetDirTime(const wchar *Name,RarTime *ftm,RarTime *ftc,RarTime *fta)
{
}


bool IsRemovable(const wchar *Name)
{
  return false;
}


int64 GetFreeDisk(const wchar *Name)
{
  return 0;
}



bool FileExist(const wchar *Name)
{
  return false;
}
 

bool WildFileExist(const wchar *Name)
{
  return false;
}


bool IsDir(uint Attr)
{
  return (Attr & 0xF000)==0x4000;
}


bool IsUnreadable(uint Attr)
{
  return false;
}


bool IsLink(uint Attr)
{
  return false;
}


bool IsDeleteAllowed(uint FileAttr)
{
  return true;
}


void PrepareToDelete(const wchar *Name)
{
}


uint GetFileAttr(const wchar *Name)
{
  return 0;
}


bool SetFileAttr(const wchar *Name,uint Attr)
{
  return true;
}


#if !defined(SFX_MODULE) && !defined(SHELL_EXT) && !defined(SETUP)
void CalcFileSum(File *SrcFile,uint *CRC32,byte *Blake2,uint Threads,int64 Size,uint Flags)
{
}
#endif


bool RenameFile(const wchar *SrcName,const wchar *DestName)
{
  return true;
}


bool DelFile(const wchar *Name)
{
  return true;
}












