import { Observable } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';

// This function reads a file from the user's file system and returns an Observable that emits slices of the file
export function readFileStream(file: File, chunkSize: number): Observable<string> {
  const fileSize = file.size;
  let offset = 0;

  return new Observable<string>((observer) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        observer.next(event.target.result as string);
        offset += chunkSize;
      }

      if (offset < fileSize) {
        readSlice();
      } else {
        observer.complete();
      }
    };

    reader.onerror = (event) => {
      observer.error(event);
    };

    function readSlice() {
      const slice = file.slice(offset, offset + chunkSize)
      reader.readAsText(slice)
    }

    readSlice();

    return () => reader.abort()
  })
}

// This function logs slices of the file to the console
export function readFileSlices(
  file: File,
  chunkSize: number
) {
  const fileStream$ = readFileStream(file, chunkSize)
  fileStream$
    .pipe(
      map((slice) => {
        console.log(slice);
        return slice;
      }),
      // takeWhile((slice) => slice.length === chunkSize)
    )
    .subscribe({
      error: (error) => {
        console.error(error);
      },
      complete: () => {
        console.log('File read complete');
      },
    });
}

// Example usage:
/*const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

fileInput.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];

  if (file) {
    logFileSlices(file, 1024);
  }
});*/
