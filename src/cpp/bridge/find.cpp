#include "../unrar/rar.hpp"

FindFile::FindFile()
{
  *FindMask=0;
  FirstCall=true;
  dirp=NULL;
}


FindFile::~FindFile()
{
}


void FindFile::SetMask(const wchar *Mask)
{
  FirstCall=true;
}


bool FindFile::Next(FindData *fd,bool GetSymLink)
{
  return false;
}


bool FindFile::FastFind(const wchar *FindMask,FindData *fd,bool GetSymLink)
{
  return false;
}
