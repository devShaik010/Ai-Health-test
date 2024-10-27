import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

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

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

let userdata = JSON.parse(localStorage.getItem('currentUser')).profile;
console.log(userdata);

let API_KEY = 'AIzaSyDuPPrRof_WLG6tT0vGbs_uRKjfnTYi2VI';

const tuner = "You are a health and food expert. Analyze the uploaded food image and provide detailed nutritional information. Give the output in a json format and always double check and give the response. the json format must contain the following fields: 'food_name', 'food_description', 'calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'vitamins', 'minerals', 'is_healthy', 'healthiness_score', 'chart'. The json format must be a valid json object use '(singlequote) instead of doublequote in the json response. do not add any other text and only give the json directly. The 'is_healthy' field should be a boolean. The 'chart' field should contain data for a doughnut chart using Chart.js, showing the macronutrient breakdown.the chart must be a doughnut chart object for chart.js which will contain a chart of all the nutrients in the product. The json format must be a valid json object use '(singlequote) instead of doublequote in the chart json response also. Here's the prompt: ";

const profileprompt = `Here is the profile of the user: ${JSON.stringify(userdata)}. Based on the user's profile, suggest if this food is suitable for them. Also provide alternative food recommendations if necessary. Give the output in JSON format: {'recommended':boolean, 'alternatives':'string of alternative food names'}. The 'recommended' field should be a boolean, indicating whether the user can consume the food based on their profile. The 'alternatives' field should be a string containing names of alternate foods separated by commas.`;

let initialForm = document.querySelector('#initialForm');
let followupInput = document.querySelector('#followupInput');
let followupButton = document.querySelector('#followupButton');
let output = document.querySelector('.output');
let followupOutputContainer = document.querySelector('.followup-output-container');
let followupOutput = document.querySelector('.followup-output');
let chartContainer = document.querySelector('#chartContainer');
let myChart = document.getElementById('myChart');
let closeButton = document.querySelector('.close-button');
let health = document.querySelector('#health');
let calorie = document.querySelector('#calorie');
let generatingloader = document.getElementById('generatingloader');
let imageBase64;
let conversation = [];

let fileInput = document.getElementById('fileInput');
let fileLabel = document.getElementById('fileLabel');

let cameraButton = document.createElement('button');
cameraButton.textContent = 'Use Camera';
fileInput.parentNode.insertBefore(cameraButton, fileInput.nextSibling);

cameraButton.addEventListener('click', function(e) {
  e.preventDefault();
  fileInput.setAttribute('capture', 'environment');
  fileInput.click();
  fileInput.removeAttribute('capture');
});

fileInput.setAttribute('accept', 'image/*');

fileInput.addEventListener('change', function(e) {
  updateFileLabel(e.target, fileLabel);
});

function updateFileLabel(input, label) {
  if (input.files && input.files[0]) {
    label.textContent = input.files[0].name;
    label.classList.add('file-selected');
  } else {
    label.textContent = 'Upload Food Image';
    label.classList.remove('file-selected');
  }
}

let myChartInstance = null;

closeButton.onclick = () => {
  followupOutputContainer.style.display = 'none';
}

initialForm.onsubmit = async (ev) => {
  ev.preventDefault();
  generatingloader.style.display = 'block';

  try {
    const file = fileInput.files[0];

    if (!file) {
      alert('Please upload an image of the food.');
      generatingloader.style.display = 'none';
      return;
    }

    console.log('Processing food image...');
    imageBase64 = await fileToBase64(file);
    console.log('Food image processed.');

    await generateInitialResponse();
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

followupButton.onclick = async () => {
  followupOutputContainer.style.display = 'block';
  if (conversation.length === 0) {
    followupOutput.innerHTML = 'Please analyze a food item first.';
    return;
  }
  
  followupOutput.textContent = 'Generating...';
  await generateFollowupResponse(followupInput.value);
};

let errorcount = 0;
async function generateInitialResponse() {
  try {
    health.className = 'health-status';
    health.style.display = 'none';

    const prompt = "What can be a first aid or steps for that?";
    let contents = [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          { text: prompt },
        ]
      }
    ];

    console.log('Calling Gemini API...');
    let encodedResponse = await callGeminiAPI(contents);
    console.log('Gemini API response received:', encodedResponse);

    // Display the raw response in the output div
    output.style.display = 'block';
    output.innerHTML = `<h3>First Aid Steps:</h3><div class="ai-response">${encodedResponse}</div>`;

    generatingloader.style.display = 'none';
    
    conversation = contents.concat([{ role: 'model', parts: [{ text: encodedResponse }] }]);
  } catch (error) {
    console.error('Error in generateInitialResponse:', error);
    output.innerHTML = `
      <h3>Error in generateInitialResponse:</h3>
      <p>${error.message || 'An unknown error occurred'}</p>
      ${error.stack ? `<h4>Stack trace:</h4><pre>${error.stack}</pre>` : ''}
    `;
    generatingloader.style.display = 'none';
  }
}

async function generateFollowupResponse(prompt) {
  conversation.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await callGeminiAPI(conversation);
  followupOutput.style.display = 'block';
  followupOutput.innerHTML = response;
  conversation.push({ role: 'model', parts: [{ text: response }] });
}

async function generateProfileResponse(prompt) {
  console.log("Generating profile response...");
  conversation.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await callGeminiAPI(conversation);
  console.log("Raw response:", response);
  
  try {
    const jsonMatch = response.match(/\{.*\}/s);
    let cleanedResponse = jsonMatch ? jsonMatch[0] : response;
    cleanedResponse = cleanedResponse.replace(/<\/?[^>]+(>|$)/g, "");
    cleanedResponse = cleanedResponse.replace(/'/g, '"');
    cleanedResponse = cleanedResponse.replace(/\s+/g, ' ').trim();

    console.log("Cleaned response:", cleanedResponse);

    const jsonResponse = JSON.parse(cleanedResponse);
    console.log("Parsed JSON response:", jsonResponse);
    
    let tableHtml = `
      <div class="profile-response-table">
        <table>
          <tr class="${jsonResponse.recommended ? 'recommended' : 'not-recommended'}">
            <th>Recommended</th>
            <td>${jsonResponse.recommended}</td>
          </tr>
          <tr>
            <th>Alternatives</th>
            <td>${jsonResponse.alternatives}</td>
          </tr>
        </table>
      </div>
    `;
    
    const profileResponseContainer = document.getElementById('profileResponseContainer');
    if (profileResponseContainer) {
      profileResponseContainer.innerHTML = tableHtml;
    } else {
      console.error('Profile response container not found');
    }
    
    conversation.push({ role: 'model', parts: [{ text: response }] });
  } catch (error) {
    console.error("Error parsing JSON:", error);
    console.log("Cleaned response:", cleanedResponse);
    
    const profileResponseContainer = document.getElementById('profileResponseContainer');
    if (profileResponseContainer) {
      profileResponseContainer.innerHTML = `<p>Error parsing response. Raw output:</p><pre>${response}</pre>`;
    }
  }
}

async function callGeminiAPI(contents) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    // Removed safety settings
  });

  const result = await model.generateContentStream({ contents });

  let buffer = [];
  for await (let response of result.stream) {
    buffer.push(response.text());
  }
  return buffer.join('');
}

async function fileToBase64(file) {
  try {
    console.log('Starting fileToBase64 for file:', file.name);
    const processedBlob = await processImage(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        console.log('fileToBase64 completed successfully');
        resolve(base64String);
      };
      reader.onerror = (error) => {
        console.error('Error in FileReader:', error);
        reject(error);
      };
      reader.readAsDataURL(processedBlob);
    });
  } catch (error) {
    console.error('Error in fileToBase64:', error);
    throw new Error(`Error processing ${file.name}: ${error.message}`);
  }
}

async function processImage(file) {
  return new Promise(async (resolve, reject) => {
    console.log('Starting processImage for file:', file.name);
    
    let processedFile = file;
    
    if ((file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) && typeof heic2any !== 'undefined') {
      try {
        const blob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        processedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
        console.log('HEIC file converted to JPEG');
      } catch (error) {
        console.error('Error converting HEIC to JPEG:', error);
      }
    } else if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      console.warn('HEIC file detected, but heic2any library is not available. Attempting to process without conversion.');
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(function(blob) {
          console.log('processImage completed successfully');
          resolve(blob);
        }, 'image/jpeg', 0.7);
      };
      img.onerror = function(error) {
        console.error('Error loading image:', error);
        reject(error);
      };
      img.src = e.target.result;
    };
    reader.onerror = function(error) {
      console.error('Error reading file:', error);
      reject(error);
    };
    reader.readAsDataURL(processedFile);
  });
}

maybeShowApiKeyBanner(API_KEY);
