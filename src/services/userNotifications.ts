import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  QuerySnapshot,
  DocumentData
} from "firebase/firestore";
import { db, auth } from "../db/firebase";
import type { Event } from "../types";
import { AllowedTag } from "./tags";

export type UserNotification = {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  eventSummary?: string | null;
  eventUrl?: string | null;
  matchedTags: AllowedTag[];
  read: boolean;
  createdAt: Date;
  createdAtTimestamp: Timestamp;
};

const NOTIFICATIONS_COLLECTION = "userNotifications";

/**
 * 사용자 알림 생성 (관심 태그와 매칭된 게시물에 대해)
 */
export async function createUserNotification(
  userId: string,
  event: Event,
  matchedTags: AllowedTag[]
): Promise<string> {
  try {
    // 중복 알림 방지: 같은 이벤트에 대한 알림이 이미 있는지 확인
    const existingQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("eventId", "==", event.id),
      where("read", "==", false),
      limit(1)
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      console.log("[NOTIF] Notification already exists for event", event.id);
      return existingSnap.docs[0].id;
    }

    const notificationData = {
      userId,
      eventId: event.id,
      eventTitle: event.title,
      eventSummary: event.summary || null,
      eventUrl: event.sourceUrl || null,
      matchedTags,
      read: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
    console.log("[NOTIF] Created notification", docRef.id, "for user", userId);
    return docRef.id;
  } catch (e) {
    console.error("[NOTIF] createUserNotification error", e);
    throw e;
  }
}

/**
 * 사용자의 알림 목록 가져오기 (최신순)
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<UserNotification[]> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        eventId: data.eventId,
        eventTitle: data.eventTitle,
        eventSummary: data.eventSummary || null,
        eventUrl: data.eventUrl || null,
        matchedTags: data.matchedTags || [],
        read: data.read || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdAtTimestamp: data.createdAt || Timestamp.now(),
      } as UserNotification;
    });
  } catch (e) {
    console.error("[NOTIF] getUserNotifications error", e);
    return [];
  }
}

/**
 * 사용자의 읽지 않은 알림 개수 가져오기
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) {
    console.error("[NOTIF] getUnreadNotificationCount error", e);
    return 0;
  }
}

/**
 * 알림을 읽음으로 표시
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, { read: true });
  } catch (e) {
    console.error("[NOTIF] markNotificationRead error", e);
    throw e;
  }
}

/**
 * 모든 알림을 읽음으로 표시
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    
    const updates = snap.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );
    await Promise.all(updates);
  } catch (e) {
    console.error("[NOTIF] markAllNotificationsRead error", e);
    throw e;
  }
}

/**
 * 사용자 알림 실시간 구독
 */
export function subscribeUserNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void,
  limitCount: number = 50
): () => void {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const unsubscribe = onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const notifications: UserNotification[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          eventId: data.eventId,
          eventTitle: data.eventTitle,
          eventSummary: data.eventSummary || null,
          eventUrl: data.eventUrl || null,
          matchedTags: data.matchedTags || [],
          read: data.read || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdAtTimestamp: data.createdAt || Timestamp.now(),
        } as UserNotification;
      });
      callback(notifications);
    },
    (error) => {
      console.error("[NOTIF] subscribeUserNotifications error", error);
    }
  );

  return unsubscribe;
}

/**
 * 새 게시물이 업로드될 때 관심 태그와 매칭하여 알림 생성
 */
export async function checkAndCreateNotificationsForNewEvent(event: Event): Promise<void> {
  try {
    // 모든 사용자의 관심 태그를 가져와서 매칭
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);
    
    const eventTags = event.tags || [];
    if (eventTags.length === 0) {
      return; // 태그가 없으면 알림 생성 안 함
    }

    const notifications: Promise<string>[] = [];

    usersSnap.forEach((userDoc) => {
      const userData = userDoc.data();
      const interestedTags = (userData.interestedTags as AllowedTag[]) || [];
      
      // 관심 태그와 이벤트 태그가 겹치는지 확인
      const matchedTags = interestedTags.filter(tag => eventTags.includes(tag));
      
      if (matchedTags.length > 0) {
        // 매칭된 태그가 있으면 알림 생성
        notifications.push(
          createUserNotification(userDoc.id, event, matchedTags)
        );
      }
    });

    if (notifications.length > 0) {
      await Promise.all(notifications);
      console.log("[NOTIF] Created", notifications.length, "notifications for event", event.id);
    }
  } catch (e) {
    console.error("[NOTIF] checkAndCreateNotificationsForNewEvent error", e);
  }
}

