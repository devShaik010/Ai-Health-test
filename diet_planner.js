import { GoogleGenerativeAI } from "@google/generative-ai";
import { displayUserProfile, updateDietPlan } from './profile.js';

const API_KEY = 'AIzaSyDuPPrRof_WLG6tT0vGbs_uRKjfnTYi2VI';

let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let userdata = currentUser ? currentUser.profile : {};
console.log(userdata);

const tuner = "You are a health and nutrition expert. Create a personalized diet plan based on the user's input and profile. Give the output in a JSON format with the following fields: 'diet_plan', 'daily_calories', 'macronutrient_breakdown', 'meal_suggestions'. IMPORTANT: Ensure your response is a valid JSON object. Do not include any markdown formatting or code blocks. Double-check your response to make sure it's properly formatted JSON before returning it. Here's the prompt: ";

let initialForm = document.querySelector('#initialForm');
let dietPreference = document.querySelector('#dietPreference');
let output = document.querySelector('#dietPlanOutput');
let generatingloader = document.getElementById('generatingloader');
let followupInput = document.getElementById('followupInput');
let followupButton = document.getElementById('followupButton');
let followupOutput = document.querySelector('.followup-output');
let closeButton = document.querySelector('.close-button');

initialForm.onsubmit = async (ev) => {
  ev.preventDefault();
  generatingloader.style.display = 'block';

  try {
    const dietPreferenceValue = dietPreference.value;

    if (!dietPreferenceValue) {
      alert('Please select a diet preference.');
      generatingloader.style.display = 'none';
      return;
    }

    await generateDietPlan(dietPreferenceValue);
  } catch (e) {
    console.error('Error in form submission:', e);
    let errorMessage = e.message || 'An unknown error occurred';
    console.error('Error details:', e);
    output.innerHTML += `<hr>Error: ${errorMessage}`;
    if (e.stack) {
      console.error('Error stack:', e.stack);
    }
    generatingloader.style.display = 'none';
  }
};

function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

async function generateDietPlan(dietPreference) {
  try {
    const prompt = `${tuner}Create a ${dietPreference} diet plan for a user with the following profile: ${safeStringify(userdata)}`;
    let contents = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    console.log('Calling Gemini API...');
    let encodedResponse = await callGeminiAPI(contents);
    console.log('Gemini API response received:', encodedResponse);

    try {
      encodedResponse = encodedResponse.replace(/```json\s?/g, '').replace(/```/g, '').trim();
      
      const jsonResponse = JSON.parse(encodedResponse);
      generatingloader.style.display = 'none';
      console.log(jsonResponse);

      let outputHtml = `
        <h2>Your Personalized Diet Plan</h2>
        <p>${jsonResponse.diet_plan}</p>
        <h3>Daily Calories: ${jsonResponse.daily_calories}</h3>
        <h3>Macronutrient Breakdown:</h3>
        <ul>
          ${Object.entries(jsonResponse.macronutrient_breakdown).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
        </ul>
        <h3>Meal Suggestions:</h3>
      `;

      for (const [meal, suggestions] of Object.entries(jsonResponse.meal_suggestions)) {
        outputHtml += `<h4>${meal}:</h4><ul>`;
        if (Array.isArray(suggestions)) {
          suggestions.forEach(suggestion => {
            outputHtml += `<li>${suggestion}</li>`;
          });
        } else {
          outputHtml += `<li>${suggestions}</li>`;
        }
        outputHtml += '</ul>';
      }

      output.style.display = 'block';
      output.innerHTML = outputHtml;

      // Update the user's diet plan
      updateDietPlan(jsonResponse);

    } catch (error) {
      console.error('Error parsing JSON:', error);
      output.innerHTML = `
        <h3>Error parsing response:</h3>
        <p>${error.message}</p>
        <h4>Raw response:</h4>
        <pre>${encodedResponse}</pre>
        <p>Please try again. If the problem persists, contact support.</p>
      `;
      generatingloader.style.display = 'none';
    }
  } catch (error) {
    console.error('Error in generateDietPlan:', error);
    output.innerHTML = `
      <h3>Error generating diet plan:</h3>
      <p>${error.message || 'An unknown error occurred in generateDietPlan'}</p>
      <p>Please try again. If the problem persists, contact support.</p>
    `;
    generatingloader.style.display = 'none';
  }
}

async function callGeminiAPI(contents) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
  });

  const result = await model.generateContentStream({ contents });

  let buffer = [];
  for await (let response of result.stream) {
    buffer.push(response.text());
  }
  return buffer.join('');
}

// Theme switcher
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
function switchTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }    
}
toggleSwitch.addEventListener('change', switchTheme, false);

const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        toggleSwitch.checked = true;
    }
}

async function generateFollowUp(question) {
  try {
    const prompt = `As a health and nutrition expert, please answer the following follow-up question about the diet plan: ${question}`;
    let contents = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    console.log('Calling Gemini API for follow-up...');
    let response = await callGeminiAPI(contents);
    console.log('Gemini API follow-up response received:', response);

    followupOutput.textContent = response;
    document.querySelector('.followup-output-container').style.display = 'block';
  } catch (error) {
    console.error('Error in generateFollowUp:', error);
    followupOutput.textContent = 'Error generating follow-up response. Please try again.';
  }
}

followupButton.addEventListener('click', () => {
  const question = followupInput.value.trim();
  if (question) {
    generateFollowUp(question);
  } else {
    alert('Please enter a follow-up question.');
  }
});

closeButton.addEventListener('click', () => {
  document.querySelector('.followup-output-container').style.display = 'none';
});

// Call displayUserProfile when the window loads
window.onload = function() {
  displayUserProfile();
  document.querySelector('.followup-output-container').style.display = 'none';
};
