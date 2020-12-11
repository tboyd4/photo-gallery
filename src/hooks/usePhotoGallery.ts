import { useState, useEffect } from "react";
import { useCamera } from "@ionic/react-hooks/camera";
import { useFilesystem, base64FromPath } from "@ionic/react-hooks/filesystem";
import { useStorage } from "@ionic/react-hooks/storage";
import { isPlatform } from "@ionic/react";
import {
  CameraResultType,
  CameraSource,
  CameraPhoto,
  Capacitor,
  FilesystemDirectory,
} from "@capacitor/core";

// interface for photos. All should look like this
export interface Photo {
  filepath: string;
  webviewPath?: string;
}

// global variable for capacitor storage api
const PHOTO_STORAGE = "photos";

// custom hook that our other components will use
export function usePhotoGallery() {
  // variables for Capacitor Storage API
  const { get, set } = useStorage();
  // function variables
  const { getPhoto } = useCamera();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { deleteFile, getUri, readFile, writeFile } = useFilesystem();

  // useEffect hook to load saved photos when custom hook is used
  useEffect(() => {
    const loadSaved = async () => {
      const photosString = await get("photos");
      const photosInStorage = (photosString
        ? JSON.parse(photosString)
        : []) as Photo[];
      // if running on web
      if (!isPlatform("hybrid")) {
        for (let photo of photosInStorage) {
          const file = await readFile({
            path: photo.filepath,
            directory: FilesystemDirectory.Data,
          });
          photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
        }
      }
      setPhotos(photosInStorage);
    };
    loadSaved();
  }, [get, readFile]);

  // save/write picture to local filesystem
  const savePicture = async (
    photo: CameraPhoto,
    fileName: string
  ): Promise<Photo> => {
    let base64Data: string;
    if (isPlatform("hybrid")) {
      const file = await readFile({
        path: photo.path!,
      });
      base64Data = file.data;
    } else {
      base64Data = await base64FromPath(photo.webPath!);
    }

    const savedFile = await writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data,
    });

    if (isPlatform("hybrid")) {
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    } else {
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
      };
    }
  };

  // take a photo
  const takePhoto = async () => {
    const cameraPhoto = await getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    const fileName = new Date().getTime() + ".jpeg";
    const savedFileImage = await savePicture(cameraPhoto, fileName);
    const newPhotos = [savedFileImage, ...photos];
    setPhotos(newPhotos);
    set(PHOTO_STORAGE, JSON.stringify(newPhotos));
  };

  // return statement
  return {
    photos,
    takePhoto,
  };
}
