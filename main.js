import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';
// Suggested code may be subject to a license. Learn more: ~LicenseLog:992475231.
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

// Check for saved user preference, if any, on load of the website
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

const tuner = "You are a health and food expert. If the user uploads the pictures of the front and back side of the product, the front side contains advertisements, illustrations an pictures that attract customer's attention (like fresh fruits images on the packaging of fruit juice which leads the user to believe it healthy when in fact it is not and the actual details on the back side of the product are different), the back side contains the actual details of the product. such as nutritional content, ingredients, allergens, and other important details. Your job is to analyze the images and provide the user with the actual details of the product. most of the market products have high sugar content, so dont just take sugar into consideration as some good products may have high or average sugar but also provide more amount of other nutrients which is healthy. Give the output in a json format and always double check and give the response. the json format must contain the following fields: 'product_name', 'product_description', 'product_ingredients', 'product_allergens', 'product_nutritional_content', 'carbohydrates/sugar', 'proteins', 'fats', 'is_healthy','healthiness_score', 'misleading_information', 'chart'. The json format must be a valid json object use '(singlequote) instead of doublequote in the json response. the is_healthy field must be a boolean value. the misleading_information field must be a boolean value. the product_name, product_description, product_ingredients, product_allergens, product_nutritional_content, carbohydrates/sugar, proteins, fats, fields must be a string. the product_name field must be a string. the product_description field must be a string. the product_ingredients field must be a string. the product_allergens field must be a string. the product_nutritional_content field must be a string. the carbohydrates field must be a string. the proteins field must be a string. the fats field must be a string. the sugar field must be a string. the is_healthy field must be a boolean value. the misleading_information field must be a boolean value. the chart must be a doughnut chart object for chart.js which will contain a chart of all the nutrients in the product. Here is the prompt: "

const profileprompt = `Here is the profile of the user: ${JSON.stringify(userdata)}. Based on the user's profile, give suggestion on if this product is good for them or not. also give alternative product recommendations. Give the output in json format. the json must be a valid json object. Here is the format: {'recommended':'boolean', 'alternatives':'string of alternative product names'} . The recommended field must be a boolean value, it tells whether the user can consume the product based on their profile or not. The alternatives field must be a string, which contains the names of alternate products separated by commas.`

let initialForm = document.querySelector('#initialForm');
let followupInput = document.querySelector('#followupInput');
let followupButton = document.querySelector('#followupButton');
// let promptInput = document.querySelector('input[name="prompt"]');
let output = document.querySelector('.output');
let followupOutputContainer = document.querySelector('.followup-output-container');
let followupOutput = document.querySelector('.followup-output');
let chartContainer = document.querySelector('#chartContainer');
let myChart = document.getElementById('myChart');
let closeButton = document.querySelector('.close-button');
let health = document.querySelector('#health');
let allergen = document.querySelector('#allergen');
let generatingloader = document.getElementById('generatingloader');
let imageBase64_1, imageBase64_2;
let conversation = [];

// Add these new variables
let fileInput1 = document.getElementById('fileInput1');
let fileInput2 = document.getElementById('fileInput2');
let fileLabel1 = document.getElementById('fileLabel1');
let fileLabel2 = document.getElementById('fileLabel2');

// Add these new variables for the new buttons
let cameraButton1 = document.createElement('button');
let cameraButton2 = document.createElement('button');

cameraButton1.textContent = 'Use Camera (Front)';
cameraButton2.textContent = 'Use Camera (Back)';

// Insert the new buttons after the file inputs
fileInput1.parentNode.insertBefore(cameraButton1, fileInput1.nextSibling);
fileInput2.parentNode.insertBefore(cameraButton2, fileInput2.nextSibling);

// Add event listeners for the camera buttons
cameraButton1.addEventListener('click', function(e) {
  e.preventDefault();
  fileInput1.setAttribute('capture', 'user');
  fileInput1.click();
  fileInput1.removeAttribute('capture');
});

cameraButton2.addEventListener('click', function(e) {
  e.preventDefault();
  fileInput2.setAttribute('capture', 'environment');
  fileInput2.click();
  fileInput2.removeAttribute('capture');
});

// Modify the file inputs to accept image input without capture
fileInput1.setAttribute('accept', 'image/*');
fileInput2.setAttribute('accept', 'image/*');

// Add event listeners for file inputs
fileInput1.addEventListener('change', function(e) {
  updateFileLabel(e.target, fileLabel1);
});

fileInput2.addEventListener('change', function(e) {
  updateFileLabel(e.target, fileLabel2);
});

// Function to update file label
function updateFileLabel(input, label) {
  if (input.files && input.files[0]) {
    label.textContent = input.files[0].name;
    label.classList.add('file-selected');
  } else {
    label.textContent = input.id === 'fileInput1' ? 'Upload Front of Product' : 'Upload Back of Product';
    label.classList.remove('file-selected');
  }
}

// Add this at the beginning of your main.js file

let myChartInstance = null; // Add this line at the top of your file with other global variables

closeButton.onclick = () => {
  followupOutputContainer.style.display = 'none';
}

initialForm.onsubmit = async (ev) => {
  ev.preventDefault();
  generatingloader.style.display = 'block';

  try {
    const file1 = fileInput1.files[0];
    const file2 = fileInput2.files[0];

    if (!file1 || !file2) {
      alert('Please upload both front and back images of the product.');
      generatingloader.style.display = 'none';
      return;
    }

    console.log('Processing front image...');
    imageBase64_1 = await fileToBase64(file1);
    console.log('Front image processed.');

    console.log('Processing back image...');
    imageBase64_2 = await fileToBase64(file2);
    console.log('Back image processed.');

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
    
    followupOutput.innerHTML = 'Please ask an initial question first.';
    // return;
  }
  
  followupOutput.textContent = 'Generating...';
  await generateFollowupResponse(followupInput.value);
};

let errorcount = 0;
async function generateInitialResponse() {
  try {
    // Add this at the beginning of the generateInitialResponse function
    health.className = 'health-status';
    allergen.className = 'allergen-status';
    health.style.display = 'none';
    allergen.style.display = 'none';

    const prompt = tuner;
    let contents = [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64_1 } },
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64_2 } },
          { text: prompt },
        ]
      }
    ];

    console.log('Calling Gemini API...');
    const encodedResponse = await callGeminiAPI(contents);
    console.log('Gemini API response received:', encodedResponse);

    try {
      const decodedResponse = encodedResponse.slice(33, encodedResponse.length - 14);
      const newString = decodedResponse.replace(/'/g, '"');
      const jsonObj = JSON.parse(newString);
      generatingloader.style.display = 'none';
      console.log(jsonObj);
      let tableHtml = '<div class="table-container"><table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
      
      for (const [key, value] of Object.entries(jsonObj)) {
        if (key !== 'chart') {
          tableHtml += `<tr><td data-label="Key">${key}</td><td data-label="Value">${value}</td></tr>`;
        }
      }
      if (jsonObj.is_healthy) {
        health.classList.add('healthy');
        health.innerHTML = '<p>Healthy</p>';
      } else {
        health.classList.add('unhealthy');
        health.innerHTML = '<p>Unhealthy</p>';
      }
      health.style.display = 'block';

      // Check for allergens
      const userAllergies = userdata.allergies && typeof userdata.allergies === 'string'
        ? userdata.allergies.split(',').map(a => a.trim().toLowerCase())
        : [];
      const productAllergens = jsonObj.product_allergens.toLowerCase();
      const hasAllergen = userAllergies.some(allergy => productAllergens.includes(allergy));

      if (hasAllergen) {
        allergen.classList.add('present');
        allergen.innerHTML = '<p>Allergen Present</p>';
      } else {
        allergen.classList.add('absent');
        allergen.innerHTML = '<p>No Allergen</p>';
      }
      allergen.style.display = 'block';

      tableHtml += '</tbody></table></div>';
      output.style.display = 'block';
      output.innerHTML = tableHtml;

      // Destroy existing chart if it exists
      if (myChartInstance) {
        myChartInstance.destroy();
      }

      // Create new chart
      myChartInstance = new Chart(myChart, {
        type: 'doughnut',
        data: {
          labels: jsonObj.chart.data.labels,
          datasets: jsonObj.chart.data.datasets
        },
        options: {
          // Your chart options here
        }
      });

      chartContainer.style.display = 'block';
      errorcount = 0;
      
    } catch (error) {
      if(errorcount>2){
        output.innerHTML = `Error parsing JSON: ${error.message}<br>Raw response: ${encodedResponse}`;
        errorcount = 0;
      }
      else{
        errorcount = errorcount+1;
        generateInitialResponse();
      }
    }
    conversation = contents.concat([{ role: 'model', parts: [{ text: encodedResponse }] }]);
    generateProfileResponse(profileprompt);
  } catch (error) {
    console.error('Error in generateInitialResponse:', error);
    console.error('Error details:', error);
    output.innerHTML = `Error: ${error.message || 'An unknown error occurred in generateInitialResponse'}`;
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    generatingloader.style.display = 'none';
  }
}


async function generateFollowupResponse(prompt) {
  // prompt = tuner + prompt;
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
    // Attempt to extract JSON from the response
    const jsonMatch = response.match(/\{.*\}/s);
    let cleanedResponse = jsonMatch ? jsonMatch[0] : response;

    // Remove any HTML tags that might be present
    cleanedResponse = cleanedResponse.replace(/<\/?[^>]+(>|$)/g, "");

    // Replace single quotes with double quotes
    cleanedResponse = cleanedResponse.replace(/'/g, '"');

    // Remove any extra whitespace
    cleanedResponse = cleanedResponse.replace(/\s+/g, ' ').trim();

    console.log("Cleaned response:", cleanedResponse);

    const jsonResponse = JSON.parse(cleanedResponse);
    console.log("Parsed JSON response:", jsonResponse);
    
    // Create the table HTML
    let tableHtml = `
      <div class="profile-response-table">
        <table>
          <tr class="${jsonResponse.recommended === 'true' ? 'recommended' : 'not-recommended'}">
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
    
    // Insert the table into the new container
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
    
    // Display the raw response if parsing fails
    const profileResponseContainer = document.getElementById('profileResponseContainer');
    if (profileResponseContainer) {
      profileResponseContainer.innerHTML = `<p>Error parsing response. Raw output:</p><pre>${response}</pre>`;
    }
  }
}

async function callGeminiAPI(contents) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });

  const result = await model.generateContentStream({ contents });

  let buffer = [];
  let md = new MarkdownIt();
  for await (let response of result.stream) {
    buffer.push(response.text());
  }
  return md.render(buffer.join(''));
}

// Helper function to convert file to base64
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

// Function to resize and compress the image
async function processImage(file) {
  return new Promise(async (resolve, reject) => {
    console.log('Starting processImage for file:', file.name);
    
    let processedFile = file;
    
    // Check if the file is HEIC and if heic2any is available
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
        // If conversion fails, we'll try to process the original file
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

// You can delete this once you've filled out an API key
maybeShowApiKeyBanner(API_KEY);
