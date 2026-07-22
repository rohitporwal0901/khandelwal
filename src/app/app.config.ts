import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getStorage, provideStorage } from '@angular/fire/storage';

import { getFirestore, provideFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLW_hLCmk15slBBKLU_bCC5YIYjihz8k0",
  authDomain: "shoppingapp-28320.firebaseapp.com",
  projectId: "shoppingapp-28320",
  storageBucket: "shoppingapp-28320.appspot.com",
  messagingSenderId: "196313674106",
  appId: "1:196313674106:web:79fb61bb2397ccee9766c3",
  measurementId: "G-XF7V5HM495"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideStorage(() => getStorage()),
    provideFirestore(() => getFirestore())
  ]
};
