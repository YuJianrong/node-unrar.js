#include "../unrar/rar.hpp"
#include "../unrar/dll.hpp"
#include <emscripten.h>
#include <emscripten/bind.h>
#include <string>
// #include <wstring>
#include <vector>

using namespace std;
using namespace emscripten;

struct ArcListFile
{
  wstring name;
  unsigned int flags;
  double packSize;
  double unpSize;
  unsigned int hostOS;
  unsigned int crc;
  unsigned int time;
  unsigned int unpVer;
  unsigned int method;
  unsigned int fileAttr;
  // unsigned int commentState;
  // wstring comment;
};

struct ArcListResult
{
  wstring comment;
  // unsigned int commentState;
  unsigned int flags;
  vector<ArcListFile> fileList;
};

struct ArcList
{
  unsigned int errCode;
  string errType;
  ArcListResult result;
};

int listCallback(UINT msg, LPARAM UserData, LPARAM P1, LPARAM P2)
{
  if (msg == UCM_NEEDPASSWORD){
    strcpy((char *)P1, (char*)UserData);
  }
  return 1;
};

ArcList getArchiveList(const wstring &filepath, const string &password)
{

  HANDLE hArcData;
  char CmtBuf[16384];
  struct RAROpenArchiveDataEx OpenArchiveData;
  memset(&OpenArchiveData, 0, sizeof(OpenArchiveData));
  OpenArchiveData.ArcNameW = (wchar_t *)filepath.c_str();
  OpenArchiveData.CmtBuf = CmtBuf;
  OpenArchiveData.CmtBufSize = sizeof(CmtBuf);
  OpenArchiveData.OpenMode = RAR_OM_LIST;
  OpenArchiveData.Callback = listCallback;
  OpenArchiveData.UserData = (LPARAM)password.c_str();

  hArcData = RAROpenArchiveEx(&OpenArchiveData);

  if (OpenArchiveData.OpenResult != 0)
  {
    ArcList errList;
    errList.errCode = OpenArchiveData.OpenResult;
    errList.errType = "ERR_OPEN";
    return errList;
  }

  ArcList list;

  list.errCode = ERAR_SUCCESS;

  if (OpenArchiveData.CmtState == 1)
  {
    Array<wchar_t> WcmtBuf(OpenArchiveData.CmtSize);
    CharToWide(CmtBuf, &WcmtBuf[0], WcmtBuf.Size() * sizeof(wchar_t));
    list.result.comment = &WcmtBuf[0];
  }

  list.result.flags = OpenArchiveData.Flags;

  int RHCode;
  // wchar_t RedirName[1024];
  struct RARHeaderDataEx HeaderData;
  memset(&HeaderData, 0, sizeof(HeaderData));

  while ((RHCode = RARReadHeaderEx(hArcData, &HeaderData)) == 0)
  {
    ArcListFile file;
    file.name = HeaderData.FileNameW;
    file.flags = HeaderData.Flags;
    file.packSize = (double)HeaderData.PackSize + (double)HeaderData.PackSizeHigh * 4294967296.0;
    file.unpSize = (double)HeaderData.UnpSize + (double)HeaderData.UnpSizeHigh * 4294967296.0;
    file.hostOS = HeaderData.HostOS;
    file.crc = HeaderData.FileCRC;
    file.time = HeaderData.FileTime;
    file.unpVer = HeaderData.UnpVer;
    file.method = HeaderData.Method;
    file.fileAttr = HeaderData.FileAttr;

    int PFCode;
    if ((PFCode = RARProcessFile(hArcData, RAR_SKIP, NULL, NULL)) != 0)
    {
      ArcList errList;
      errList.errCode = PFCode;
      errList.errType = "ERR_PROCESS";
      return errList;
    }
    list.result.fileList.push_back(file);
  }

  if (RHCode != 0 && RHCode != ERAR_END_ARCHIVE)
  {
    ArcList errList;
    errList.errCode = RHCode;
    errList.errType = "ERR_READ";
    return errList;
  }

  RARCloseArchive(hArcData);
  return list;
}

EMSCRIPTEN_BINDINGS(stl_wrappers)
{
  value_object<ArcList>("ArcList")
      .field("errCode", &ArcList::errCode)
      .field("errType", &ArcList::errType)
      .field("result", &ArcList::result);

  value_object<ArcListResult>("ArcListResult")
      .field("comment", &ArcListResult::comment)
      .field("fileList", &ArcListResult::fileList)
      .field("flags", &ArcListResult::flags);

  value_object<ArcListFile>("ArcListFile")
      .field("name", &ArcListFile::name)
      .field("flags", &ArcListFile::flags)
      .field("packSize", &ArcListFile::packSize)
      .field("unpSize", &ArcListFile::unpSize)
      .field("hostOS", &ArcListFile::hostOS)
      .field("crc", &ArcListFile::crc)
      .field("time", &ArcListFile::time)
      .field("unpVer", &ArcListFile::unpVer)
      .field("method", &ArcListFile::method)
      .field("fileAttr", &ArcListFile::fileAttr);

  register_vector<ArcListFile>("VectorArcListFile");

  emscripten::function("getArchiveList", &getArchiveList);
}