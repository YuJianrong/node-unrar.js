#include "../unrar/rar.hpp"
#include "../unrar/dll.hpp"
#include <emscripten.h>
#include <emscripten/bind.h>
#include <string>
// #include <wstring>
#include <vector>
#include <locale.h>

using namespace std;
using namespace emscripten;

char callbackPassword[MAXPASSWORD] = "";

int listCallback(UINT msg, LPARAM UserData, LPARAM P1, LPARAM P2)
{
  if (msg == UCM_NEEDPASSWORD)
  {
    strcpy((char *)P1, callbackPassword);
  }
  return 1;
};

struct State
{
  unsigned int errCode;
  string errType;
};

struct ArcHeader
{
  State state;
  wstring comment;
  // unsigned int commentState;
  unsigned int flags;
};

struct ArcFileHeader
{
  State state;
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
};

class RarArchive
{
public:
  RarArchive() : hArcData(NULL)
  {
    setlocale(LC_ALL, "C.UTF-8");
  }
  ~RarArchive()
  {
    if (hArcData)
    {
      RARCloseArchive(hArcData);
    }
    hArcData = NULL;
  }

  ArcHeader open(const wstring &filepath, const wstring &password, bool forList)
  {
    char CmtBuf[16384];
    struct RAROpenArchiveDataEx OpenArchiveData;
    memset(&OpenArchiveData, 0, sizeof(OpenArchiveData));
    OpenArchiveData.ArcNameW = (wchar_t *)filepath.c_str();
    OpenArchiveData.CmtBuf = CmtBuf;
    OpenArchiveData.CmtBufSize = sizeof(CmtBuf);
    OpenArchiveData.OpenMode = forList ? RAR_OM_LIST : RAR_OM_EXTRACT;
    OpenArchiveData.Callback = listCallback;
    // OpenArchiveData.UserData = (LPARAM)password.c_str();
    OpenArchiveData.UserData = NULL;
    WideToUtf(password.c_str(), callbackPassword, MAXPASSWORD);

    hArcData = RAROpenArchiveEx(&OpenArchiveData);

    ArcHeader header;

    header.state.errType = "ERR_OPEN";

    if (OpenArchiveData.OpenResult != 0)
    {
      header.state.errCode = OpenArchiveData.OpenResult;
      return header;
    }

    header.state.errCode = ERAR_SUCCESS;

    header.flags = OpenArchiveData.Flags;
    if (OpenArchiveData.CmtState == 1)
    {
      Array<wchar_t> WcmtBuf(OpenArchiveData.CmtSize);
      CharToWide(CmtBuf, &WcmtBuf[0], WcmtBuf.Size() * sizeof(wchar_t));
      header.comment = &WcmtBuf[0];
    }
    return header;
  }

  ArcFileHeader getFileHeader()
  {
    struct RARHeaderDataEx HeaderData;
    memset(&HeaderData, 0, sizeof(HeaderData));
    int RHCode = RARReadHeaderEx(hArcData, &HeaderData);

    ArcFileHeader header;

    header.state.errCode = RHCode;
    header.state.errType = "ERR_READ";

    if (RHCode == 0)
    {
      header.name = HeaderData.FileNameW;
      header.flags = HeaderData.Flags;
      header.packSize = (double)HeaderData.PackSize + (double)HeaderData.PackSizeHigh * 4294967296.0;
      header.unpSize = (double)HeaderData.UnpSize + (double)HeaderData.UnpSizeHigh * 4294967296.0;
      header.hostOS = HeaderData.HostOS;
      header.crc = HeaderData.FileCRC;
      header.time = HeaderData.FileTime;
      header.unpVer = HeaderData.UnpVer;
      header.method = HeaderData.Method;
      header.fileAttr = HeaderData.FileAttr;
    }
    return header;
  }

  State readFile(bool skip)
  {
    State state;
    state.errCode = RARProcessFile(hArcData, skip ? RAR_SKIP : RAR_EXTRACT, NULL, NULL);
    state.errType = "ERR_PROCESS";
    return state;
  }

private:
  HANDLE hArcData;
};

EMSCRIPTEN_BINDINGS(stl_wrappers)
{
  class_<RarArchive>("RarArchive")
    .constructor< >()
    .function("open" , &RarArchive::open)
    .function("getFileHeader" , &RarArchive::getFileHeader)
    .function("readFile" , &RarArchive::readFile)
    ;

  value_object<State>("State")
      .field("errCode", &State::errCode)
      .field("errType", &State::errType)
      ;

  value_object<ArcHeader>("ArcHeader")
      .field("state", &ArcHeader::state)
      .field("comment", &ArcHeader::comment)
      .field("flags", &ArcHeader::flags);

  value_object<ArcFileHeader>("ArcFileHeader")
      .field("state", &ArcFileHeader::state)
      .field("name", &ArcFileHeader::name)
      .field("flags", &ArcFileHeader::flags)
      .field("packSize", &ArcFileHeader::packSize)
      .field("unpSize", &ArcFileHeader::unpSize)
      .field("hostOS", &ArcFileHeader::hostOS)
      .field("crc", &ArcFileHeader::crc)
      .field("time", &ArcFileHeader::time)
      .field("unpVer", &ArcFileHeader::unpVer)
      .field("method", &ArcFileHeader::method)
      .field("fileAttr", &ArcFileHeader::fileAttr);
}
