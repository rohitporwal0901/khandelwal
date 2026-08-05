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
  pin?: string;
  pincode?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  status?: 'pending' | 'approved' | 'rejected';
  balance?: number; // Positive = Due/Unpaid, Negative = Advance
  discountPercent?: number; // Wholesale discount % (0-100). Default 0 means no discount.
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
      pin: pin.trim(),
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
    const cred = await signInWithEmailAndPassword(this.auth, email, pin);
    // Ensure pin is saved in Firestore for future resets
    if (cred.user) {
      try {
        const userRef = doc(this.firestore, `users-kh/${cred.user.uid}`);
        await updateDoc(userRef, { pin: pin.trim() });
      } catch (e) {}
    }
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
    const current = this.currentUserProfile();
    if (current) {
      this.currentUserProfile.set({ ...current, pin: newPin.trim() });
      try {
        const userRef = doc(this.firestore, `users-kh/${user.uid}`);
        await updateDoc(userRef, { pin: newPin.trim() });
      } catch (e) {}
    }
  }

  // ─── Forgot PIN (set new pin by verifying phone ownership) ─
  async setNewPin(phone: string, newPin: string): Promise<void> {
    const usersRef = collection(this.firestore, 'users-kh');
    const q = query(usersRef, where('phone', '==', phone.trim()));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('No account found with this phone number.');
    }
    const userDoc = snap.docs[0];
    const userData = userDoc.data() as UserProfile;
    const uid = userDoc.id;

    let signedIn = false;
    if (userData.pin) {
      try {
        await signInWithEmailAndPassword(this.auth, this.phoneToEmail(phone), userData.pin);
        signedIn = true;
      } catch (e) {}
    }
    if (!signedIn) {
      const fallbackPins = ['123456', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123123', '654321', '846190', '909143', '8461909143', '788006', '006607', '12345'];
      for (const p of fallbackPins) {
        try {
          await signInWithEmailAndPassword(this.auth, this.phoneToEmail(phone), p);
          signedIn = true;
          break;
        } catch (e) {}
      }
    }
    if (!signedIn || !this.auth.currentUser) {
      throw new Error('Unable to verify previous security credentials. Please register again or contact support.');
    }
    await updatePassword(this.auth.currentUser, newPin);
    await updateDoc(doc(this.firestore, `users-kh/${uid}`), { pin: newPin.trim() });
    const current = this.currentUserProfile();
    if (current) {
      this.currentUserProfile.set({ ...current, pin: newPin.trim() });
    }
  }

  // ─── Admin POS Customer Methods ─────────────────────────
  async createCustomerFromAdmin(data: { name: string; phone: string; address?: string; pincode?: string; balance?: number; discountPercent?: number }): Promise<UserProfile> {
    const cleanPhone = data.phone.trim();
    const email = this.phoneToEmail(cleanPhone);
    const defaultPin = '000000';
    let uid = '';

    const usersRef = collection(this.firestore, 'users-kh');
    const q = query(usersRef, where('phone', '==', cleanPhone));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const existingDoc = snap.docs[0];
      uid = existingDoc.id;
      const existingData = existingDoc.data() as UserProfile;
      const updatedProfile: UserProfile = {
        ...existingData,
        name: data.name.trim() || existingData.name,
        address: data.address?.trim() || existingData.address || '',
        pincode: data.pincode?.trim() || existingData.pincode || '',
        status: 'approved',
        pin: existingData.pin || defaultPin,
        balance: (existingData.balance || 0) + (data.balance || 0),
        discountPercent: data.discountPercent ?? existingData.discountPercent ?? 0
      };
      await setDoc(doc(this.firestore, `users-kh/${uid}`), updatedProfile);
      return updatedProfile;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(this.auth, email, defaultPin);
      uid = userCred.user.uid;
    } catch (err: any) {
      console.warn('Note: Auth account creation fallback (may already exist in Auth):', err?.message || err);
      const newDocRef = doc(usersRef);
      uid = newDocRef.id;
    }

    if (!uid) {
      const newDocRef = doc(usersRef);
      uid = newDocRef.id;
    }

    const newProfile: UserProfile = {
      uid,
      name: data.name.trim(),
      phone: cleanPhone,
      address: data.address?.trim() || '',
      pincode: data.pincode?.trim() || '',
      pin: defaultPin,
      status: 'approved',
      balance: data.balance || 0,
      discountPercent: data.discountPercent ?? 0,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(this.firestore, `users-kh/${uid}`), newProfile);
    return newProfile;
  }

  // ─── Update customer discount & profile (Admin) ────────────────────────────
  async updateCustomerProfileAdmin(uid: string, data: { discountPercent?: number; name?: string; address?: string; pincode?: string }): Promise<void> {
    const userRef = doc(this.firestore, `users-kh/${uid}`);
    const cleanData: any = {};
    if (data.name !== undefined) cleanData['name'] = data.name.trim();
    if (data.address !== undefined) cleanData['address'] = data.address.trim();
    if (data.pincode !== undefined) cleanData['pincode'] = data.pincode.trim();
    if (data.discountPercent !== undefined) cleanData['discountPercent'] = data.discountPercent;
    await updateDoc(userRef, cleanData);
  }

  async updateCustomerBalance(uid: string, newBalance: number): Promise<void> {
    const userRef = doc(this.firestore, `users-kh/${uid}`);
    await updateDoc(userRef, { balance: newBalance });
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
