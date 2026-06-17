import fs from 'fs';
import { geminiApiKey, name } from './hidden.js';
import { getWeatherDataForCity } from './API-requests.js';

async function callGeminiAPI(finalPrompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }]
            })
        });

        if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
        
        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Failed to communicate with Gemini:", error);
        return null;
    }
}

function saveReportToDesktop(reportText) {
    try {
        const filename = `weather_report_daily.txt`;
        
        fs.writeFileSync(filename, reportText, 'utf8');
        console.log(`Success! Updated your daily report: ${filename}`);
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
    const tomorrowRainChance = weatherData.hourly?.precipitation_probability?.[30] || 0;
    const tomorrowWind = weatherData.hourly?.wind_speed_10m?.[34] || "12-15";

    // Format today's real-world execution date beautifully
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
    3. Avoid using overly complicated workds such as "blustery" or "exfoliation"
    
    TIMING & CONTEXT PERSPECTIVE:
    - This report is read by a single camp counselor named ${name} at around dinnertime the day it was created. 
    - Explicitly state today's date in the intro: ${todayFormatted}.
    - Emphasize the forecast for TOMORROW morning and afternoon so they can plan accordingly.
    
    LIVE WEATHER DATA TO INTEGRATE (ONLY USE IMPERIAL SYSTEM FOR TEMPERATURE AND WIND SPEED):
    - Current Tonight Temperature: ${currentTemp}°C
    - Current Tonight Wind Speed: ${currentWind} m/s
    - Tomorrow Early Morning Run Temp: ${tomorrowMorningTemp}°C
    - Tomorrow Afternoon Peak Temp: ${tomorrowAfternoonTemp}°C
    - Tomorrow Rain/Precipitation Probability: ${tomorrowRainChance}%
    - Tomorrow Average Wind Speed: ${tomorrowWind} m/s
    `;   
    const aiGeneratedDraft = await callGeminiAPI(prompt, GEMINI_API_KEY);

    if (!aiGeneratedDraft) {
        console.error("Failed to generate AI draft.");
        return;
    }

    if (aiGeneratedDraft) {
        saveReportToDesktop(aiGeneratedDraft);
    }
}

main();