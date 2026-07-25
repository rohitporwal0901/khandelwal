import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private profileUnsubscribe?: () => void;

  // ─── Signals ─────────────────────────────────────────────
  isAuthenticated = signal<boolean>(false);
  isAdmin = signal<boolean>(false);
  currentUser = signal<User | null>(null);
  currentUserProfile = signal<UserProfile | null>(null);
  authLoading = signal<boolean>(true); // true while Firebase checks session

  constructor() {
    // Admin session check (existing)
    const savedAdminState = localStorage.getItem('isAdminLoggedIn');
    if (savedAdminState === 'true') {
      this.isAdmin.set(true);
    }

    // Firebase Auth state listener — session persist until logout
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        // Listen to live profile updates from Firestore
        if (this.profileUnsubscribe) this.profileUnsubscribe();
        const userRef = doc(this.firestore, `users-kh/${user.uid}`);
        this.profileUnsubscribe = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (!data.status) data.status = 'approved'; // Default existing users to approved
            this.currentUserProfile.set(data);
          }
          this.authLoading.set(false);
        }, (err) => {
          console.error('Profile snapshot error:', err);
          this.authLoading.set(false);
        });
      } else {
        if (this.profileUnsubscribe) {
          this.profileUnsubscribe();
          this.profileUnsubscribe = undefined;
        }
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.currentUserProfile.set(null);
        this.authLoading.set(false);
      }
    });
  }

  // ─── Internal helper: phone → email format ───────────────
  private phoneToEmail(phone: string): string {
    return `${phone.trim()}@khandelwal.app`;
  }

  // ─── Fetch UserProfile from Firestore (manual refresh) ────
  async fetchUserProfile(uid: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, `users-kh/${uid}`);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (!data.status) data.status = 'approved';
        this.currentUserProfile.set(data);
      }
    } catch (e) {
      console.error('Error fetching user profile:', e);
    }
  }

  // ─── Check if phone is already registered ────────────────
  async isPhoneRegistered(phone: string): Promise<boolean> {
    try {
      const usersRef = collection(this.firestore, 'users-kh');
      const q = query(usersRef, where('phone', '==', phone.trim()));
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (e) {
      return false;
    }
  }

  // ─── Register new user ───────────────────────────────────
  async registerUser(name: string, phone: string, pin: string): Promise<void> {
    const email = this.phoneToEmail(phone);
    const userCred = await createUserWithEmailAndPassword(this.auth, email, pin);
    const uid = userCred.user.uid;

    const profile: UserProfile = {
      uid,
      name: name.trim(),
      phone: phone.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save profile to Firestore users-kh
    const userRef = doc(this.firestore, `users-kh/${uid}`);
    await setDoc(userRef, profile);

    this.currentUserProfile.set(profile);
  }

  // ─── Update user status (Admin verification) ───────────────
  async updateUserStatus(uid: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    const userRef = doc(this.firestore, `users-kh/${uid}`);
    await updateDoc(userRef, { status });
  }

  // ─── Update user profile photo ─────────────────────────────
  async updateProfilePhoto(uid: string, photoUrl: string): Promise<void> {
    const userRef = doc(this.firestore, `users-kh/${uid}`);
    await updateDoc(userRef, { photoUrl });
    const current = this.currentUserProfile();
    if (current) {
      this.currentUserProfile.set({ ...current, photoUrl });
    }
  }

  // ─── Fetch all users for Admin ─────────────────────────────
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const usersRef = collection(this.firestore, 'users-kh');
      const snap = await getDocs(usersRef);
      return snap.docs.map(d => {
        const data = d.data() as UserProfile;
        if (!data.status) data.status = 'approved';
        return data;
      }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (e) {
      console.error('Error fetching all users:', e);
      return [];
    }
  }

  // ─── Login existing user ─────────────────────────────────
  async loginUser(phone: string, pin: string): Promise<void> {
    const email = this.phoneToEmail(phone);
    await signInWithEmailAndPassword(this.auth, email, pin);
    // onAuthStateChanged will handle profile fetch automatically
  }

  // ─── Logout user ─────────────────────────────────────────
  async logoutUser(): Promise<void> {
    await signOut(this.auth);
  }

  // ─── Update user profile (after order / from account page) ─
  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const userRef = doc(this.firestore, `users-kh/${uid}`);
    await updateDoc(userRef, data);
    // Update local signal
    const current = this.currentUserProfile();
    if (current) {
      this.currentUserProfile.set({ ...current, ...data });
    }
  }

  // ─── Reset PIN (change password) ─────────────────────────
  async resetPin(currentPin: string, newPin: string): Promise<void> {
    const user = this.currentUser();
    if (!user || !user.email) throw new Error('Not authenticated');
    // Re-authenticate first
    const credential = EmailAuthProvider.credential(user.email, currentPin);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPin);
  }

  // ─── Forgot PIN (set new pin by verifying phone ownership) ─
  async setNewPin(phone: string, newPin: string): Promise<void> {
    // Sign in with old pin not needed — we use updatePassword directly
    // Since user knows their phone, we re-login them after updating
    const user = this.currentUser();
    if (!user) throw new Error('Not authenticated');
    await updatePassword(user, newPin);
  }

  // ─── Admin methods (existing) ─────────────────────────────
  login(email: string, pass: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'admin@khandelwalcards.com' && pass === '123456') {
          this.isAdmin.set(true);
          localStorage.setItem('isAdminLoggedIn', 'true');
          resolve(true);
        } else {
          reject('Invalid credentials');
        }
      }, 1500);
    });
  }

  logout() {
    this.isAdmin.set(false);
    localStorage.removeItem('isAdminLoggedIn');
  }
}
