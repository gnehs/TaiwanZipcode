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

#include "lzge.h"

dword   rngbits[]={ 0, 0, 0, 1, 1, 2, 2, 2, 3,3,4,4,5,5,6,6,7,
                     7,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,16,
                     17,17,17,17,17,17,17,17,17,17,17,17,17,17, 0xFF };
dword   rngmax[ 51 ];
dword   rngmin[ 51 ];

dword   lenmax[ 20 ];
dword   lenmin[ 20 ];
dword   lenbits[]={ 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 21, 0xFF };

//--------------------------------------------------------------------------

dword  STACKAPI lzge_bits( dword val )
{
   dword  i;

   for ( i = 1; i < 32; i++ )
   {
      if ( (dword)val < (dword)( 1 << i )) return i;
   }
   return 32;
}

//--------------------------------------------------------------------------

void  STDCALL  lzge_ranges( pslzge lzge, dword maxoff )
{
   dword i = 3, j = MIN_OFFSET;

   rngmax[0] = 0;
   rngmax[1] = 0;
   rngmax[2] = 0;
//   rngmax[3] = 0;
   while ( rngbits[i] != 0xFF )
   {
      rngmin[i] = j;
      j += 1 << rngbits[i];
      rngmax[i] = j - 1;
//      printf("%i = %i - %i %x\n", i, rngmin[i], rngmax[i], rngmax[i] );
      i++;
      if ( rngmax[i - 1] >= maxoff ) break;
   }
   lzge->numoff = i;
   lzge->maxbit = lzge_bits( maxoff );
   lenbits[ ALL_LEN - 1 ] = lzge->maxbit;
//   printf("Maxoff=%i\n", maxoff );
   i = 0;
   j = MATCH_LEN;
   while ( lenbits[i] != 0xFF )
   {
      lenmin[i] = j;
      j += 1 << lenbits[i];
      lenmax[i] = j - 1;
//      printf("%i b=%i %i - %i %x\n", i, lenbits[i], lenmin[i], lenmax[i], lenmax[i] );
      i++;
   }
}

//--------------------------------------------------------------------------
