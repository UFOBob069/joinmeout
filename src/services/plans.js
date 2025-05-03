import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const plansCollection = collection(db, 'plans');

export const createPlan = async (planData) => {
  try {
    const planWithTimestamp = {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(plansCollection, planWithTimestamp);
    return { id: docRef.id, ...planWithTimestamp };
  } catch (error) {
    throw error;
  }
};

export const getPlan = async (planId) => {
  try {
    const planDoc = await getDoc(doc(db, 'plans', planId));
    if (planDoc.exists()) {
      return { id: planDoc.id, ...planDoc.data() };
    }
    throw new Error('Plan not found');
  } catch (error) {
    throw error;
  }
};

export const getPlans = async (filters = {}) => {
  try {
    let q = plansCollection;
    
    // Apply filters
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.startTime) {
      q = query(q, where('dateTime', '>=', filters.startTime));
    }
    if (filters.endTime) {
      q = query(q, where('dateTime', '<=', filters.endTime));
    }
    if (filters.location) {
      q = query(q, where('location', '==', filters.location));
    }
    
    // Apply sorting
    q = query(q, orderBy('dateTime', 'asc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const updatePlan = async (planId, planData) => {
  try {
    const planRef = doc(db, 'plans', planId);
    const planWithTimestamp = {
      ...planData,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(planRef, planWithTimestamp);
    return { id: planId, ...planWithTimestamp };
  } catch (error) {
    throw error;
  }
};

export const deletePlan = async (planId) => {
  try {
    await deleteDoc(doc(db, 'plans', planId));
  } catch (error) {
    throw error;
  }
};

export const joinPlan = async (planId, userId) => {
  try {
    const planRef = doc(db, 'plans', planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      throw new Error('Plan not found');
    }
    
    const plan = planDoc.data();
    if (plan.attendees.includes(userId)) {
      throw new Error('User already joined this plan');
    }
    
    if (plan.attendees.length >= plan.maxAttendees) {
      throw new Error('Plan is full');
    }
    
    await updateDoc(planRef, {
      attendees: [...plan.attendees, userId],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

export const leavePlan = async (planId, userId) => {
  try {
    const planRef = doc(db, 'plans', planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      throw new Error('Plan not found');
    }
    
    const plan = planDoc.data();
    if (!plan.attendees.includes(userId)) {
      throw new Error('User is not part of this plan');
    }
    
    await updateDoc(planRef, {
      attendees: plan.attendees.filter(id => id !== userId),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
}; 