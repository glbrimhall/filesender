<?php
/*
 * FileSender www.filesender.org
 *
 * Copyright (c) 2009-2012, AARNet, Belnet, HEAnet, SURFnet, UNINETT
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * *    Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * *    Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * *    Neither the name of AARNet, Belnet, HEAnet, SURFnet and UNINETT nor the
 *     names of its contributors may be used to endorse or promote products
 *     derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

if (!defined('FILESENDER_BASE')) die('Missing environment');

/**
 *  Gives access to a file on the filesystem, preserving uploaded filenames
 *  
 *  Main use case is where after upload into Filesender's storage
 *  another application on the same system needs access to the files in
 *  the storage preserving the original filenames for easy recognition.
 *  
 */
class StorageFilesystemPreserveName extends StorageFilesystem {
  
    /**
     * Build file storage name (without base path)
     * 
     * @param File $file
     * 
     * @return string filename
     */
    public static function buildFilename(File $file) {
        static::setup();
        
        // To support dirtree upload, see if $file->name has a basepath
        $filename = $file->name;

        $pos = strrpos($filename, '/');
      
        if (!($pos === false)) {
          $filename = substr($file->name, $pos + 1);
        }

        return $filename;
    }
  
    /**
     * Build file storage path (without filename)
     * 
     * @param File $file
     * 
     * @return string path
     */
    public static function buildPath(File $file) {
        static::setup();

        $owner = $file->__get('owner');
        $storage_root_path = self::$path;

        if (empty($owner)) {
            $owner = 'guest';
        }

        $subpath = '/'.$owner;

        // $owner may be prefixed with text ending in # by filesender, need to remove
        $pos = strrpos($owner, '#');
      
        if (!($pos === false)) {
          $subpath = '/'.substr($owner, $pos + 1);
        }

        // To support dirtree upload, see if $file->name has a basepath
        $basepath = $file->name;

        $pos = strrpos($basepath, '/');
      
        if (!($pos === false)) {
          $basepath = substr($file->name, 0, $pos);
        }
        
        // For archive systems such as archivematica, any set of files belonging
        // to an archival set needs to be in an enclosing directory.
        // defaulting to naming the directory "uid=name", which also
        // should guarentee unique folder name
        $subpath .= '/'.$file->uid.'='.$basepath;
        
        // validate owner/uid=name subpath, creating dirs if needed
        $path = $storage_root_path;
        foreach(array_filter(explode('/', $subpath)) as $sub) {
            $path .= $sub;
            
            if(!is_dir($path) && !mkdir($path))
                throw new StorageFilesystemCannotCreatePathException($path, $file);
            
            if(!is_writable($path))
                throw new StorageFilesystemCannotWriteException($path, $file);
            
            $path .= '/';
        }
        return $path;
    }
}
