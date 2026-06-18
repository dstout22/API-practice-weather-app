import fs from 'fs';
import { geminiApiKey, name } from './hidden.js';
import { getWeatherDataForCity } from './API-requests.js';

async function callGeminiAPI(finalPrompt, apiKey) {
    let model = "gemini-2.5-flash"; 
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }]
                })
            });

            if (!response.ok) {
                throw new Error(`API returned status ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            return result.candidates[0].content.parts[0].text;

        } catch (error) {
            console.warn(`Attempt ${attempt} on ${model} failed: ${error.message}`);
            
            if (attempt === maxRetries) {
                console.error("All retry attempts exhausted.");
                return null;
            }

            if (attempt === 1) {
                model = "gemini-2.5-flash-lite";
                url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                console.log(`Switching backup model to ${model}...`);
            }

            // 3. Exponential Backoff + Jitter (e.g., 2s, 4s + a random variance)
            const baseDelay = Math.pow(2, attempt) * 1000; 
            const jitter = Math.random() * 1000; 
            const finalDelay = baseDelay + jitter;

            console.log(`Retrying in ${(finalDelay / 1000).toFixed(2)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
    }
}

function saveReportToDesktop(reportText) {
    try {
        const filename = "C:\\Users\\David\\Downloads\\weather_report_daily.txt";
        
        fs.writeFileSync(filename, reportText, 'utf8');
        console.log(`Success! Updated your daily report in Downloads: ${filename}`);
    } catch (error) {
        console.error("Failed to write file to disk:", error);
    }
}

async function main() {
    const GEMINI_API_KEY = geminiApiKey;
    const targetCity = "Holland"; //Currently just want to use Holland

    console.log(`Starting automated weather briefing for ${targetCity}...`);

    const weatherData = await getWeatherDataForCity(targetCity);
    
    const currentTemp = weatherData.current?.temperature_2m;
    const currentWind = weatherData.current?.wind_speed_10m;

    // Using safe array optional chaining (?.[index]) to prevent crashes if a key is missing
    const tomorrowMorningTemp = weatherData.hourly?.temperature_2m?.[30] || "mid-70s"; 
    const tomorrowAfternoonTemp = weatherData.hourly?.temperature_2m?.[38] || "mid-80s";
    const tomorrowWind = weatherData.hourly?.wind_speed_10m?.[34] || "12-15";

    const toFahrenheit = (c) => typeof c === 'number' ? Math.round((c * 9) / 5 + 32) : c;
    const toMPH = (kmh) => typeof kmh === 'number' ? Math.round(kmh * 0.621371) : kmh;

    const currentTempF = toFahrenheit(currentTemp);
    const currentWindMPH = toMPH(currentWind);
    const tomorrowMorningTempF = toFahrenheit(tomorrowMorningTemp);
    const tomorrowAfternoonTempF = toFahrenheit(tomorrowAfternoonTemp);
    const tomorrowWindMPH = toMPH(tomorrowWind);

    const tomorrowCampRainHours = weatherData.hourly?.precipitation_probability?.slice(29, 45) || [];
    const tomorrowRainChance = tomorrowCampRainHours.length > 0 ? Math.max(...tomorrowCampRainHours) : 0;

    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let prompt = `
    You are a professional weather assistant for camp counselors. Your tone is informative, warm, and naturally witty, but never overly goofy or cheesy—limit yourself to just one subtle joke or clever remark.
    
    Draft a brief evening weather report for a camp in Holland, MI. 
    The camp is located on Lake Michigan as well, but only use Michigan once in the report.
    The camp quarters are cabins, not tents, so the weather report is for considerations of
    activities such as swimming, going down to the beach, and playing outside.

    CRITICAL FORMATTING RULES:
    1. Output strictly in PLAIN TEXT. Do not use any markdown bolding (**), headers (#), bullet points, or special characters.
    2. The length must be strictly between 500 and 1000 characters.
    3. Avoid using overly complicated words such as "blustery" or "exfoliation"
    
    TIMING & CONTEXT PERSPECTIVE:
    - This report is read by a single camp counselor named ${name} at around dinnertime the day it was created. 
    - Your name is NOT ${name}, but rather "Weatherman Gemini"
    - Explicitly state today's date in the intro: ${todayFormatted}.
    - Emphasize the forecast for TOMORROW morning and afternoon so they can plan accordingly.
    
    LIVE WEATHER DATA TO INTEGRATE (ONLY USE IMPERIAL SYSTEM FOR TEMPERATURE AND WIND SPEED):
    - Current Tonight Temperature: ${currentTempF}°F
    - Current Tonight Wind Speed: ${currentWindMPH} mph
    - Tomorrow Early Morning Run Temp: ${tomorrowMorningTempF}°F
    - Tomorrow Afternoon Peak Temp: ${tomorrowAfternoonTempF}°F
    - Tomorrow Hourly Rain Forecast: ${tomorrowCampRainHours}
    - Tomorrow Rain Risk: ${tomorrowRainChance}%
    - Tomorrow Average Wind Speed: ${tomorrowWindMPH} mph
    `;   
    const aiGeneratedDraft = await callGeminiAPI(prompt, GEMINI_API_KEY);

    if (!aiGeneratedDraft) {
        console.error("Failed to generate AI draft.");
        return;
    }

    saveReportToDesktop(aiGeneratedDraft);
}

main();