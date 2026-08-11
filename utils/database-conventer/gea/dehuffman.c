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

#include "huffman.h"
/*#ifdef LAUNCHER
   #include "K:\Gentee\Gentee Language\Opti Launcher\memory.h"
#else
   #include "K:\Gentee\Gentee Language\VM Lib\memory.h"
#endif*/

//--------------------------------------------------------------------------

dword  STACKAPI huf_unpacknum( pshuf huf, dword bits )
{
   dword  i = bits;
   dword  result = 0;

   while ( i )
   {
      result |= (( *huf->ptr >> huf->bit ) & 1 ) << ( bits - i-- );
      if ( !huf->bit )
      {
         huf->bit = 7;
         huf->ptr++;
      }
      else huf->bit--;
   }

   return result;
}

//--------------------------------------------------------------------------

void  STDCALL huf_detree( pshuf huf )
{
   dword  bits;
   dword  i;
//   dword  freq[ 2048 ];
   pdword freq = huf->freq;

   bits = huf_unpacknum( huf, huf->numcode < 32 ? 2 : 3  ) + 1;

   huf->min = huf_unpacknum( huf, bits );
   huf->max = huf->min + huf_unpacknum( huf, bits );

//   printf( "Bits = %i Min=%i Max=%i\n", bits, huf->min, huf->max );
   if ( huf->fixed )
   {
      for ( i = 0; i < huf->numcode; i++ )
      {
         freq[ i ] = huf_unpacknum( huf, bits );
//    printf("freq=%i\n", huf->tree[i].freq );
      }
   }
   else
   {
      shuf   huftree;
      dword  code;

      huf_new( &huftree, PRET_ALPHABET );
      huftree.ptr = huf->ptr;
      huftree.bit = huf->bit;
      huftree.fixed = 1;

      huf_detree( &huftree );
      i = 0;
      while ( i < huf->numcode )
      {
         freq[i] = huf_inbits( &huftree );
//         printf("%i:%i ", i, freq[i] );
         if ( freq[i] > PRET_MAXCODE )
         {
            switch ( freq[i] )
            {
               case PRET_ZERO2:
                  code = huf_unpacknum( &huftree, 2 ) + PRET_OFF1;
                  break;
               case PRET_ZERO4:
                  code = huf_unpacknum( &huftree, 4 ) + PRET_OFF2;
                  break;
/*               case PRET_ZERO5:
                  code = huf_unpacknum( &huftree, 5 ) + 16;
                  break;*/
               case PRET_ZERO6:
                  code = huf_unpacknum( &huftree, 6 ) + PRET_OFF3;
                  break;
               case PRET_BIG:
                  code = huf_unpacknum( &huftree, bits );
                  break;
            }
            if ( freq[i] == PRET_BIG ) freq[ i ] = code;
            else
            {
               freq[ i ] = 0;
               while ( --code )
               {
                  freq[ ++i ] = 0;
               }
            }
         }
         i++;
      }

      huf->ptr = huftree.ptr;
      huf->bit = huftree.bit;

      huf_destroy( &huftree );
      // Переводим длины из специального представления
/*      for ( i = 0; i < huf->numcode; i++ )
      {
         if ( !freq[i] )
         {
            k = i + 1;
            while ( k < huf->numcode && !freq[k] &&
                  ( k - i < PRET_MAXZERO - 1 ))
               k++;
            if ( k > 2 )
            {
               i += k;
               k -= 3;
               if ( k < 4 )
                  freq[ fi++ ] = ( k << 24 ) | PRET_ZERO2;
               else
                  if ( k < 8 )
                     freq[ fi++ ] = ( k << 24 ) | PRET_ZERO3;
                  else
                     freq[ fi++ ] = ( k << 24 ) | PRET_ZERO5;
               continue;
            }
         }
         if ( freq[i] > PRET_MAXCODE )
         {
            freq[ fi++ ] = ( freq[i] << 24 ) | PRET_BIG;
         }
         else
            freq[ fi++ ] = freq[i];
      }*/
   }
   for ( i = 0; i < huf->numcode; i++ )
   {
      dword k;
      // Поднимаем на минимум
      k = huf->prevlen[ i ];
      huf->prevlen[i] = 0;
         if ( freq[i] <= PRET_MAXCODE )
         {
//            huf->prevlen[i] = freq[ i ];
            freq[i] = ( freq[i] + k ) % ( PRET_MAXCODE + 1 );
            huf->prevlen[i] = ( byte )freq[ i ];
//            if (!huf->fixed )
//               printf("%i=%i ", i, huf->prevlen[i] );
         }
      if ( freq[i] )
      {
/*         if ( freq[i] <= PRET_MAXCODE )
         {
            huf->prevlen[i] = freq[ i ];
//            freq[i] = ( freq[i] + k ) & PRET_MAXCODE;
//            huf->prevlen[i] = freq[ i ];
            printf("%i=%i ", i, freq[i] );
         }*/
         freq[ i ] += huf->min - 1;
      }
//      if ( freq[ i ] )
//         freq[ i ] += huf->min - 1;
   }
      /* Делаем предыдущую глубину из текущей, если текущая и
      // предыдущая > PRET_MAXCODE
      if ( i && freq[i] <= PRET_MAXCODE && freq[ i - 1 ] <= PRET_MAXCODE )
      {
 //        freq[i] = ( freq[i] + 15 + freq[ i - 1 ] ) & PRET_MAXCODE ;
      }*/

   for ( i = 0; i < huf->numcode; i++ )
   {
      huf->tree[i].freq = freq[i];
   }
   huf_normilize( huf );
}

//--------------------------------------------------------------------------

dword  STACKAPI huf_inbits( pshuf huf )
{
   pshufleaf  cur = huf->root;

   do {
      cur = (( *huf->ptr >> huf->bit ) & 1) ? cur->right : cur->left;
      if ( !huf->bit )
      {
         huf->bit = 7;
         huf->ptr++;
      }
      else huf->bit--;
   } while ( cur->left );

   return cur - huf->tree;
}

//--------------------------------------------------------------------------
