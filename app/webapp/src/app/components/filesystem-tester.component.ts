import { DirectoryManager } from 'ack-angular-components/directory-managers/DirectoryManagers'
import { Component, EventEmitter, Output } from '@angular/core'
import { delay } from '../delay';

interface Test {
  pass?: boolean
  label: string
  name: string // 'create-file' | 'delete-file' | 'create-folder' | 'delete-folder' | 'create-sub-file' | 'delete-sub-file'
  error?: any
}

const createFileFirstName = 'create-file-test'
const createFileName = createFileFirstName + '.json'
const createFolderName = 'create-folder-test'

const content = 'hello 0123456789 world'

@Component({
  selector: 'filesystem-tester',
  templateUrl: './filesystem-tester.component.html',
}) export class FileSystemComponent {
  @Output() $error = new EventEmitter<Error>()
  @Output() linkClick = new EventEmitter<MouseEvent>()
  
  testDir?: DirectoryManager
  
  tests: Test[] = [{
    label: 'create file',
    name: 'create-file',
  },{
    label: 'read file as url',
    name: 'read-file-url',
  },{
    label: 'stream file',
    name: 'stream-file',
  },{
    label: 'delete file',
    name: 'delete-file',
  },{
    label: 'create folder',
    name: 'create-folder',
  },{
    label: 'create existing folder', // just run same test again
    name: 'create-folder',
  },{
    label: 'create sub file',
    name: 'create-sub-file',
  },{
    label: 'find sub file',
    name: 'find-sub-file',
  },{
    label: 'read write stream',
    name: 'read-write-stream'
  },{
    label: 'delete sub file',
    name: 'delete-sub-file',
  },{
    label: 'delete folder',
    name: 'delete-folder',
  },{
    label: 'create sub folder',
    name: 'create-sub-folder',
  },{
    label: 'delete sub folder',
    name: 'delete-sub-folder',
  },{
    label: 'create sub folder file',
    name: 'create-sub-folder-file',
  },{
    label: 'delete folder recursive',
    name: 'delete-folder-recursive',
  }]
  passes?: boolean

  links = [{
    url: 'https://caniuse.com/?search=showDirectoryPicker',
    label: 'showDirectoryPicker',
  }, {
    url: 'https://caniuse.com/?search=createWritable',
    label: 'createWritable',
  }, {
    url: 'https://caniuse.com/?search=queryPermission',
    label: 'queryPermission',
  }, {
    url: 'https://caniuse.com/?search=FileSystemSyncAccessHandle.write',
    label: 'FileSystemSyncAccessHandle.write',
  }]


  async testDirectory(dir: DirectoryManager) {
    delete this.passes // clear previous results

    this.tests.forEach(test => {
      delete test.error
      delete test.pass
    })

    for (let index=0; index < this.tests.length; ++index) {
      const test = this.tests[index]

      this.runTest(test, dir)

      await delay(800)
    }

    this.passes = this.tests.every(x => x.pass)
  }

  async runTest(
    test: Test,
    dir: DirectoryManager,
  ) {
    switch (test.name) {
      case 'create-file':
        await this.testCreateFile(test, dir)
        break
      case 'read-file-url':
        await this.testReadFileAsUrl(test, dir)
        break
      case 'stream-file':
        await this.testStreamFile(test, dir)
        break
      case 'delete-file':
        await this.testDeleteFile(test, dir)
        break
      case 'create-folder':
        await this.testCreateFolder(test, dir)
        break
      case 'create-sub-file':
        await this.testCreateSubFile(test, dir)
        break
      case 'find-sub-file':
        await this.testFindSubFile(test, dir)
        break
      case 'read-write-stream':
        await this.testReadWriteStream(test, dir)
        break
      case 'delete-sub-file':
        await this.testDeleteSubFile(test, dir)
        break
      case 'delete-folder':
        await this.testDeleteFolder(test, dir)
        break
      case 'create-sub-folder':
        await this.testCreateSubFolder(test, dir)
        break
      case 'delete-sub-folder':
        await this.testDeleteSubFolder(test, dir)
        break
      case 'create-sub-folder-file':
        await this.testCreateSubDirFile(test, dir)
        break
      case 'delete-folder-recursive':
        await this.testDeleteFolderRecursive(test, dir)
        break
    }
  }

  async testCreateFile(test: Test, dir: DirectoryManager) {    
    try {
      const newFile = await dir.file(createFileName, { create: true })
      await newFile.write(content)
      const readResult = await newFile.readAsText()
      test.pass = readResult === content

      if ( !test.pass ) {
        test.error = 'possibly wrote file but failed to read'
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testReadFileAsUrl(test: Test, dir: DirectoryManager) {    
    try {
      const newFile = await dir.file(createFileName) // should exist from last file
      const result = await newFile.readAsDataURL()
      
      // const split = readResult.split(',')
      //split.shift() // application/json;base64,
      //const base = split.join(',')
      const base64 = result.replace(/^.+,/,'') // remove data:application/json;base64,
      
      console.log('readResult',{base64,content, result})
      const decodedString = atob(base64) // Buffer.from(readResult, 'base64').toString() // atob(readResult);
      test.pass = decodedString === content

      if ( !test.pass ) {
        test.error = 'possibly wrote file but failed to read as url'
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testStreamFile(
    test: Test,
    dir: DirectoryManager
  ) {
    try {
      const newFile = await dir.file(createFileName) // should exist from last test
      const allStrings: string[] = []
      const chunkSize = 5
      await newFile.readTextStream((string) => allStrings.push(string), chunkSize)
      const sections = splitStringIntoSections(content, chunkSize)
      test.pass = sections.every((expect, index) => {
        const received = allStrings[index]
        if ( received === expect ) {
          return true
        }

        test.error = `stream read did not match expected. Expected: ${expect} but got: ${received.slice(0, 30)}`
        return false
      })
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testDeleteFile(test: Test, dir: DirectoryManager) {    
    try {
      await dir.removeEntry(createFileName)
      const fileNames = await dir.listFiles()
      test.pass = !fileNames.includes(createFileName)
      
      if ( !test.pass ) {
        test.error = `Could not delete file ${createFileName}`
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testCreateSubFile(test: Test, dir: DirectoryManager) {    
    try {
      const path = createFolderName+'/'+createFileName
      const newFile = await dir.file(path, { create: true })
      const content = '{}'
      await newFile.write(content)
      const readResult = await newFile.readAsText()
      test.pass = readResult === content
      if ( !test.pass ) {
        test.error = 'possibly wrote sub file but failed to read'
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testFindSubFile(test: Test, dir: DirectoryManager) {    
    try {
      const path = createFolderName+'/'+createFileName
      // file was created in last test
      const newFile = await dir.findFileByPath(path)

      if ( !newFile ) {
        test.error = 'failed to find created file'
        return
      }

      const content = '{}'
      const readResult = await newFile.readAsText()
      test.pass = readResult === content
      if ( !test.pass ) {
        test.error = 'possibly wrote sub file but failed to read expected data'
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testReadWriteStream(test: Test, dir: DirectoryManager) {
    // const path = createFolderName+'/'+createFileName
    const writePath = createFolderName+'/'+createFileName+'.write.json'
    const file = await dir.file(writePath, { create: true })
    const repeat = 4
    
    // write our assigned content several times over
    await file.write(content.repeat(repeat))

    // read our assigned content in streams the size of original content and write it in reverse
    await file.readWriteTextStream(() => {
      return content.split('').reverse().join('')
    }, content.length)
    
    const testText = await file.readAsText()

    const expect = content.split('').reverse().join('').repeat(repeat)
    test.pass = testText === expect

    if ( !test.pass ) {
      test.error = `Expected ${expect} but instead got ${testText}`
    }
  }
  
  async testDeleteSubFile(test: Test, dir: DirectoryManager) {    
    try {
      const path = createFolderName+'/'+createFileName
      await dir.removeEntry(path)
      const fileNames = await dir.listFiles()
      test.pass = !fileNames.includes(createFileName)
      
      if ( !test.pass ) {
        test.error = `Could not delete sub file ${createFileName}`
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testCreateFolder(test: Test, dir: DirectoryManager) {    
    try {
      await dir.createDirectory(createFolderName)
      const names = await dir.listFolders()
      test.pass = names.includes(createFolderName)
      if ( !test.pass ) {
        test.error = `Could not create folder ${createFolderName}.`
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testDeleteFolder(test: Test, dir: DirectoryManager) {    
    try {
      await dir.removeEntry(createFolderName, { recursive: true })
      const fileNames = await dir.listFolders()
      test.pass = !fileNames.includes(createFolderName)
      
      if ( !test.pass ) {
        test.error = `Could not delete folder ${createFileName}`
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testCreateSubFolder(test: Test, dir: DirectoryManager) {    
    try {
      const folder2 = 'subfolder2'
      const path = createFolderName + '/' + folder2
      const created = await dir.getDirectory(path, { create: true })
      const names = await dir.listFolders()
      test.pass = names.includes(createFolderName)
      if ( !test.pass ) {
        test.error = `Could not create folder ${createFolderName}.`
      }

      if ( !created.path.includes(folder2) || !created.path.includes(createFolderName) ) {
        test.error = 'Created folder path was not read back correctly'
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testDeleteSubFolder(test: Test, dir: DirectoryManager) {    
    try {
      await dir.removeEntry(createFolderName, { recursive: true })
      const fileNames = await dir.listFolders()
      test.pass = !fileNames.includes(createFolderName)
      
      if ( !test.pass ) {
        test.error = `Could not delete folder ${createFileName}`
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testCreateSubDirFile(test: Test, dir: DirectoryManager) {    
    try {
      const folder2 = 'subfolder2'
      const path = createFolderName + '/' + folder2 +'/' + createFileName
      const newFile = await dir.file(path, { create: true })
      const content = '{}'
      await newFile.write(content)
      const readResult = await newFile.readAsText()
      test.pass = readResult === content
      
      if ( !test.pass ) {
        test.error = 'possibly wrote sub file but failed to read'
      }

      if ( !newFile.directory.path.includes(folder2) || !newFile.directory.path.includes(createFolderName) ) {
        test.error = 'The readout of directory pathing is incorrect'
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }

  async testDeleteFolderRecursive(
    test: Test,
    dir: DirectoryManager
  ) {    
    try {
      await dir.removeEntry(createFolderName, { recursive: true })
      const fileNames = await dir.listFolders()
      test.pass = !fileNames.includes(createFolderName)
      
      if ( !test.pass ) {
        test.error = `Could not delete folder ${createFileName}`
      }
    } catch (err: any) {
      test.pass = false
      test.error = err.message
      console.error(err)
    }
  }
}

function splitStringIntoSections(
  str: string,
  count: number
): string[] {
  const sections: string[] = []

  for (let i = 0; i < str.length; i += count) {
    const section = str.slice(i, i + count)
    sections.push(section)
  }

  return sections
}
