import {
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const usersCollection = collection(db, 'users');

export const createUserProfile = async (userId, userData) => {
  try {
    const userWithTimestamp = {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await addDoc(usersCollection, {
      ...userWithTimestamp,
      id: userId,
    });
    return { id: userId, ...userWithTimestamp };
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    throw new Error('User profile not found');
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userWithTimestamp = {
      ...userData,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(userRef, userWithTimestamp);
    return { id: userId, ...userWithTimestamp };
  } catch (error) {
    throw error;
  }
};

export const getUserPlans = async (userId, type = 'hosted') => {
  try {
    const plansCollection = collection(db, 'plans');
    let q;
    
    if (type === 'hosted') {
      q = query(plansCollection, where('hostId', '==', userId));
    } else {
      q = query(plansCollection, where('attendees', 'array-contains', userId));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const updateUserStats = async (userId, stats) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      stats: {
        ...stats,
        updatedAt: serverTimestamp(),
      },
    });
  } catch (error) {
    throw error;
  }
};

export const searchUsers = async (searchTerm) => {
  try {
    const q = query(
      usersCollection,
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
}; 