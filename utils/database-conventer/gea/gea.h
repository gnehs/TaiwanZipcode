/******************************************************************************
*
* Copyright (C) 2009, The Gentee Group. All rights reserved.
* This file is part of the Gentee open source project - http://www.gentee.com.
*
* THIS FILE IS PROVIDED UNDER THE TERMS OF THE GENTEE LICENSE ("AGREEMENT").
* ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE CONSTITUTES RECIPIENTS
* ACCEPTANCE OF THE AGREEMENT.
*
* Author: Alexey Krivonogov ( gentee )
*
******************************************************************************/

#ifndef _GEA_
#define _GEA_

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

   #ifdef __cplusplus
      extern "C" {
   #endif // __cplusplus

#define STACKAPI
#define STDCALL
#define OSAPI
#if !defined(_WIN32) && !defined(__cdecl)
#define __cdecl
#endif

typedef    uint32_t       dword;
typedef    uint16_t       word;
typedef    uint32_t       uint;
typedef    uint32_t*      puint;
typedef    unsigned char  byte;
#define min(a,b) ((a) < (b) ? (a) : (b))
typedef    unsigned char* pbyte;
typedef    dword*         pdword;
typedef    word*          pword;

#define mem_alloc(n) malloc(n)
#define mem_allocz(n) calloc(1, (n))
#define mem_free(p) free(p)
#define mem_zero(p,n) memset((p), 0, (n))
#define mem_copy(d,s,n) memcpy((d), (s), (n))

typedef uint  ( __cdecl *gea_call )( uint, puint, ... );

//--------------------------------------------------------------------------
// Функция обратной связи при упаковке/распаковке
#ifndef UNPPMD
dword STDCALL fgeauser( dword param, dword userfunc, dword pgeaparam );
#endif
//--------------------------------------------------------------------------

   #ifdef __cplusplus
      }
   #endif // __cplusplus

#endif // _GEA_
