import { firstValueFrom, from, Observable, of } from 'rxjs'
import { map, mergeMap, toArray } from 'rxjs/operators'

type streamCallback = (string: string, stats: {percent: number, isLast: boolean}) => any

// This function reads a file from the user's file system and returns an Observable that emits slices of the file
export function readFileStream(
  file: File,
  chunkSize: number,
  callback: streamCallback = (string: string) => undefined
): Observable<string> {
  const fileSize = file.size
  let offset = 0

  return new Observable<string>((observer) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      if (event.target?.result) {
        const string = event.target.result as string
        const isLast = (offset + chunkSize) >= file.size
        const percent = offset / file.size * 100
        
        callback(string, {isLast, percent})
        observer.next(string)
        
        // increment
        offset += chunkSize
      }

      if (offset < fileSize) {
        readSlice()
      } else {
        observer.complete()
      }
    }

    reader.onerror = (event) => {
      observer.error(event)
    }

    function readSlice() {
      const slice = file.slice(offset, offset + chunkSize)
      reader.readAsText(slice)
    }

    readSlice()

    return () => reader.abort()
  })
}

export async function readWriteFile(
  fileHandle: FileSystemFileHandle,
  transformFn: (chunk: string, stats: {
    isLast: boolean, percent: number
  }) => string,
  chunkSize = 1024 * 1024, // 1 MB
): Promise<void> {
  const [file, writableStream] = await Promise.all([
    fileHandle.getFile(),
    fileHandle.createWritable(), // Open a writable stream for the file
  ])
  
  let offset = 0
  // Create an observable to read the file in chunks
  const readStream$: Observable<FileSliceRead> = readFileAsStringBuffer(
    file, offset, chunkSize
  )

  // Transform each chunk using the provided function
  const transformedStream$: Observable<unknown> = readStream$.pipe(
    map(chunk => {
      const string = transformFn(chunk.string, {
        isLast: (chunk.offset + chunkSize) >= file.size,
        percent: chunk.offset / file.size * 100,
      })

      const result = {
        string,
        offset: chunk.offset,
      }
      
      return writableStream.write(result.string)
    }),
  )

  // Wait for both streams to complete before closing the writable stream
  await Promise.all(
    await firstValueFrom(
      transformedStream$.pipe( toArray() ) // bring together all observables as array of promises
    )
  )

  // now that writing is done we can close file writing
  await writableStream.close()
}

interface FileSliceRead {
  string: string,
  offset: number,
}

function readFileAsStringBuffer(
  file: File,
  offset: number,
  chunkSize: number,
): Observable<FileSliceRead> {
  return new Observable<FileSliceRead>(subscriber => {
    let lastOffset = offset
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      const string = (event.target as any).result as string
      
      if ( string.length ) {
        subscriber.next({ string, offset: lastOffset })
      }

      lastOffset = offset
      
      if (offset < file.size) {
        readChunk();
      } else {
        subscriber.complete();
      }
    }
    
    fileReader.onerror = (error) => subscriber.error(error);
    
    const readChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      offset += chunkSize;
      fileReader.readAsText(slice)
    }

    readChunk()
  })
}
