// js/admin-setup.js
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    getFirestore
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getConfig } from './config.js';

// Initialize Firebase
const firebaseConfig = getConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to create a new admin user
async function createAdmin(username, password) {
    try {
        // Check if username already exists
        const adminQuery = query(
            collection(db, 'admins'),
            where('username', '==', username)
        );

        const querySnapshot = await getDocs(adminQuery);

        if (!querySnapshot.empty) {
            console.error(`Admin with username "${username}" already exists`);
            return false;
        }

        // Create new admin
        const adminData = {
            username: username,
            password: password,
            createdAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'admins'), adminData);
        console.log(`Admin created with ID: ${docRef.id}`);
        return true;
    } catch (error) {
        console.error('Error creating admin:', error);
        return false;
    }
}

// Add to window object so it can be called from console
window.createAdmin = createAdmin;

console.log('Admin setup script loaded. Use window.createAdmin(username, password) to create an admin user.');
console.log('Example: window.createAdmin("admin", "password")');