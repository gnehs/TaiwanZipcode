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
//#include "..\GEA\gea.h"
/*#ifdef LAUNCHER
   #include "K:\Gentee\Gentee Language\Opti Launcher\memory.h"
#else
   #include "K:\Gentee\Gentee Language\VM Lib\memory.h"
#endif*/

//--------------------------------------------------------------------------

dword  STDCALL lzge_decode( pbyte in, pbyte out, dword size, pslzge lzge )
{
   shuf   huf;
   pbyte  end = out + size;
   dword  result;
   dword  value, len, offset, lenfooter, footer;
   dword  numblock = 0;

   out += lzge->solidoff;

   if ( !lzge->hufblock ) lzge->hufblock = HUF_BLOCK;
   lzge_ranges( lzge, (1 << min( 21, lzge_bits( size ))) - 1 );
   lzge->mft[0] = 3;
   lzge->mft[1] = 4;
   lzge->mft[2] = 5;

   huf_new( &huf, LZGE_ALPHABET + SLOT_LEN * lzge->numoff + 1 );
//   huf.fixed = 1;

   huf.ptr = in;
   huf.bit = 7;

   while ( out < end )
   {
      numblock = 0;
      // Строим дерево
      huf_detree( &huf );
      while ( numblock != lzge->hufblock && out < end )
      {
//          printf("%i\r", size - ( end - out ));
         value = huf_inbits( &huf );
         if ( value < LZGE_ALPHABET )
         {
            *out++ = ( byte )value;
//            printf("%c", *( out - 1 ));
         }
         else
         {
            value -= LZGE_ALPHABET;
            if ( value == SLOT_LEN * lzge->numoff )
            {
               footer = 0;
               lenfooter = SLOT_LEN;
            }
            else
            {
               lenfooter = value % SLOT_LEN;
               footer = value / SLOT_LEN;
            }
            len = huf_unpacknum( &huf, lenbits[ lenfooter ] )+ lenmin[ lenfooter ];
            if ( lenfooter == SLOT_LEN )
               offset = huf_unpacknum( &huf, lzge->maxbit );
            else
            {
               offset = huf_unpacknum( &huf, rngbits[ footer ] ) + rngmin[ footer ];

               if ( !footer ) offset = lzge->mft[0];
               else
                  if ( footer == 1 )
                  {
                     offset = lzge->mft[1];
                     lzge->mft[1] = lzge->mft[ 0 ];
                     lzge->mft[0] = offset;
                  }
                  else
                  {
                     if ( footer == 2 )
                        offset = lzge->mft[2];
                     lzge->mft[2] = lzge->mft[1];
                     lzge->mft[1] = lzge->mft[0];
                     lzge->mft[0] = offset;
                  }
            }
//            if ( numblock < 100 )
//               printf("cur = %i footer = %i lenfooter = %i Off=%i Len=%i\n",
//               size - ( end - out ), footer, lenfooter, offset, len );
            if ( offset < len )
            {
               while ( len-- )
               {
                  *out = *( out - offset );
                  out++;
               }
            }
            else
            {
               mem_copy( out, out - offset, len );
               out += len;
            }
//            printf("o");
         }
         //*out++ = ( byte )huf_inbits( &huf );
         numblock++;
      }
//      printf("\n-------------%i\n", size );

//      if ( out - prev >= GU_STEP )
//      {
      fgeauser( size - ( end - out ) - lzge->solidoff, lzge->userfunc,
                lzge->pgeaparam );
//      }
   }
//   fgeauser( GUProcess, size, 0 );
//   if ( huf.bit ) huf.ptr++;
   result = huf.ptr - in + 1;//out;

   huf_destroy( &huf );

   return result;
}

//--------------------------------------------------------------------------
