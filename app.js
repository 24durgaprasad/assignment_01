// Gemini Document Chat - Frontend JavaScript

const API_BASE_URL = 'http://localhost:8000';

let sessionId = null;
let messageCount = 0;
let selectedFile = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const uploadBtn = document.getElementById('uploadBtn');
const clearBtn = document.getElementById('clearBtn');
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messages');
const typingIndicator = document.getElementById('typingIndicator');
const chunkCountElement = document.getElementById('chunkCount');
const messageCountElement = document.getElementById('messageCount');

// Initialize session on load
async function initializeSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/session/new`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Failed to create session');
        }

        const data = await response.json();
        sessionId = data.session_id;
        console.log('Session created:', sessionId);
    } catch (error) {
        console.error('Error creating session:', error);
        showStatusMessage('Failed to initialize session', 'error');
    }
}

// File selection handler
fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];

    if (selectedFile) {
        const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
        fileLabel.textContent = `${selectedFile.name} (${fileSizeMB} MB)`;
        uploadBtn.disabled = false;
    } else {
        fileLabel.textContent = 'Choose PDF or TXT file (max 50MB)';
        uploadBtn.disabled = true;
    }
});

// Upload document
uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }

        const data = await response.json();

        showStatusMessage(
            `✓ ${data.message} Ready to chat!`,
            'success'
        );

        chunkCountElement.textContent = `${data.total_chunks} chunks`;

        // Enable chat
        queryInput.disabled = false;
        sendBtn.disabled = false;
        queryInput.focus();

        // Clear file input
        fileInput.value = '';
        selectedFile = null;
        fileLabel.textContent = 'Choose PDF or TXT file (max 50MB)';

        // Remove empty state
        const emptyState = messagesContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

    } catch (error) {
        console.error('Upload error:', error);
        showStatusMessage(`Error: ${error.message}`, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload';
    }
});

// Send chat message
async function sendMessage() {
    const query = queryInput.value.trim();

    if (!query || !sessionId) return;

    // Disable input
    queryInput.disabled = true;
    sendBtn.disabled = true;

    // Add user message to UI
    addMessage('user', query);
    queryInput.value = '';

    // Show typing indicator
    typingIndicator.classList.add('active');

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                query: query,
                top_k: 5,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get response');
        }

        const data = await response.json();

        // Add assistant response
        addMessage('assistant', data.response, data.relevant_chunks);

    } catch (error) {
        console.error('Chat error:', error);
        addMessage('assistant', `Error: ${error.message}`);
    } finally {
        // Hide typing indicator
        typingIndicator.classList.remove('active');

        // Re-enable input
        queryInput.disabled = false;
        sendBtn.disabled = false;
        queryInput.focus();
    }
}

// Send button click
sendBtn.addEventListener('click', sendMessage);

// Enter key to send
queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Add message to UI
function addMessage(role, content, sources = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'You' : 'AI';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Format message content
    const textNode = document.createElement('div');
    textNode.textContent = content;
    messageContent.appendChild(textNode);

    // Add sources if available
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'sources';
        sourcesDiv.innerHTML = `
            <strong>Sources:</strong> Referenced ${sources.length} document chunk(s)
        `;
        messageContent.appendChild(sourcesDiv);
    }

    if (role === 'user') {
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(avatar);
    } else {
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Update message count
    messageCount++;
    messageCountElement.textContent = `${messageCount} messages`;
}

// Show status message
function showStatusMessage(message, type = 'success') {
    // Remove existing status messages
    const existingMessages = document.querySelectorAll('.status-message');
    existingMessages.forEach(msg => msg.remove());

    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message ${type}`;
    statusDiv.textContent = message;

    const uploadSection = document.querySelector('.upload-section');
    uploadSection.parentNode.insertBefore(statusDiv, uploadSection.nextSibling);

    // Auto remove after 5 seconds
    setTimeout(() => {
        statusDiv.remove();
    }, 5000);
}

// Clear all data
clearBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all documents and chat history?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/clear`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to clear data');
        }

        // Reset UI
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <h2>Welcome to Gemini Document Chat!</h2>
                <p>Upload a PDF or text file to start chatting about its content.</p>
            </div>
        `;

        queryInput.disabled = true;
        sendBtn.disabled = true;
        queryInput.value = '';

        chunkCountElement.textContent = '0 chunks';
        messageCount = 0;
        messageCountElement.textContent = '0 messages';

        showStatusMessage('All data cleared successfully', 'success');

        // Create new session
        await initializeSession();

    } catch (error) {
        console.error('Clear error:', error);
        showStatusMessage(`Error: ${error.message}`, 'error');
    }
});

// Load stats on page load
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);

        if (response.ok) {
            const data = await response.json();

            if (data.vector_store.total_chunks > 0) {
                chunkCountElement.textContent = `${data.vector_store.total_chunks} chunks`;
                queryInput.disabled = false;
                sendBtn.disabled = false;

                // Remove empty state if exists
                const emptyState = messagesContainer.querySelector('.empty-state');
                if (emptyState) {
                    emptyState.remove();
                }
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeSession();
    await loadStats();
});

// Check API health
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (!response.ok) {
            throw new Error('API not responding');
        }
    } catch (error) {
        showStatusMessage(
            'Cannot connect to backend API. Make sure the server is running on http://localhost:8000',
            'error'
        );
    }
}

checkAPIHealth();
