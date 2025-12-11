// AI Routine Generation using Gemini API

// Configuration - SET YOUR GEMINI API KEY HERE
// Get your API key from: https://makersuite.google.com/app/apikey
const GEMINI_API_KEY = 'AIzaSyCBKg4Rpiqx-BoAkDxl4X1CR7bi-19nz1I';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContenthttps://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
/**
 * Summarize a user's account/profile using Gemini.
 * @param {Object} profileData - { name, username, email, contactNumber, stats? }
 * @returns {Promise<string>} Summary text
 */
async function summarizeAccountWithAI(profileData = {}) {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY == '') {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in js/ai-routine.js');
    }

    const prompt = `You are an assistant that creates a concise "About" section for a student's study dashboard.

Profile data:
- Name: ${profileData.name || 'Not provided'}
- Username: ${profileData.username || 'Not provided'}
- Email: ${profileData.email || 'Not provided'}
- Contact Number: ${profileData.contactNumber || 'Not provided'}
- Study Subjects: ${(profileData.subjects || []).join(', ') || 'Not provided'}
- Preferences: ${JSON.stringify(profileData.preferences || {}, null, 2)}
- Recent stats (optional): ${profileData.stats ? JSON.stringify(profileData.stats) : 'Not provided'}

Write 2-3 concise sentences (max ~120 words total) that:
1) Introduce the student by name/username
2) Highlight focus areas and habits
3) Encourage balanced study + breaks

Keep it friendly and motivating. Return only the plain text summary.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let responseText = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      responseText = data.candidates[0].content.parts[0].text;
    }

    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Clean markdown fences if any
    responseText = responseText.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```[a-zA-Z]*\n?/g, '').replace(/```\n?/g, '').trim();
    }

    return responseText;
  } catch (error) {
    console.error('AI Profile Summary Error:', error);
    throw error;
  }
}

/**
 * Generate a study routine using AI (Gemini API)
 * @param {Array<string>} subjects - List of subjects to study
 * @param {number} totalTime - Total available time in minutes
 * @param {Object} userPreferences - User preferences (studyInterval, breakInterval, exerciseInterval)
 * @returns {Promise<Array>} Generated routine blocks
 */
async function generateRoutineWithAI(subjects, totalTime, userPreferences = {}) {
  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'AIzaSyCBwAKKG5-g0Eoh8m6o_p0CFJsnL6tpk1g') {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in js/ai-routine.js');
    }

    const studyInterval = userPreferences.studyInterval || 45;
    const breakInterval = userPreferences.breakInterval || 10;
    const exerciseInterval = userPreferences.exerciseInterval || 15;

    // Create prompt for Gemini
    const prompt = `You are an expert study planner. Create an optimized study routine for a student.

Subjects to study: ${subjects.join(', ')}
Total available time: ${totalTime} minutes
Preferred study interval: ${studyInterval} minutes
Preferred break interval: ${breakInterval} minutes
Preferred exercise interval: ${exerciseInterval} minutes

Requirements:
1. Alternate between study sessions, breaks, and exercise
2. Distribute subjects evenly
3. Include breaks every 45-60 minutes
4. Include exercise every 2-3 study sessions
5. Use Pomodoro technique principles
6. Ensure total time doesn't exceed ${totalTime} minutes

Return ONLY a valid JSON array with this exact structure:
[
  {
    "type": "study",
    "subject": "Math",
    "duration": 45,
    "description": "Focus on Algebra and Calculus"
  },
  {
    "type": "break",
    "duration": 10,
    "description": "Rest and hydrate"
  },
  {
    "type": "exercise",
    "duration": 15,
    "description": "Light stretching and jumping jacks"
  }
]

Types allowed: "study", "break", "exercise"
For study blocks, include "subject" field
For break/exercise blocks, include "activity" field (optional)
Always include "duration" (in minutes) and "description" fields.

Return ONLY the JSON array, no other text.`;

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Extract text from Gemini response
    let responseText = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      responseText = data.candidates[0].content.parts[0].text;
    }

    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Clean the response - remove markdown code blocks if present
    responseText = responseText.trim();
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '');
    }

    // Parse JSON
    const routine = JSON.parse(responseText);

    // Validate and normalize routine structure
    const normalizedRoutine = routine.map((block, index) => {
      return {
        type: block.type || 'study',
        subject: block.subject || null,
        duration: parseInt(block.duration) || 15,
        sessionNumber: index + 1,
        description: block.description || block.activity || `${block.type} session`,
        activity: block.activity || null
      };
    });

    // Verify total time doesn't exceed available time
    const totalRoutineTime = normalizedRoutine.reduce((sum, block) => sum + block.duration, 0);
    if (totalRoutineTime > totalTime) {
      // Scale down proportionally
      const scaleFactor = totalTime / totalRoutineTime;
      normalizedRoutine.forEach(block => {
        block.duration = Math.round(block.duration * scaleFactor);
      });
    }

    return normalizedRoutine;

  } catch (error) {
    console.error('AI Routine Generation Error:', error);
    
    // Fallback to regular routine generator
    console.log('Falling back to standard routine generator...');
    if (typeof generateRoutine === 'function') {
      return generateRoutine(
        subjects,
        totalTime,
        userPreferences.studyInterval || 45,
        userPreferences.breakInterval || 10,
        userPreferences.exerciseInterval || 15
      );
    }
    
    throw error;
  }
}

/**
 * Set Gemini API key (for user configuration)
 */
function setGeminiAPIKey(apiKey) {
  if (typeof window !== 'undefined') {
    window.GEMINI_API_KEY = apiKey;
    GEMINI_API_KEY = apiKey; // Also update module variable
  }
}

// Export functions
if (typeof window !== 'undefined') {
  window.generateRoutineWithAI = generateRoutineWithAI;
  window.setGeminiAPIKey = setGeminiAPIKey;
  window.summarizeAccountWithAI = summarizeAccountWithAI;
}

