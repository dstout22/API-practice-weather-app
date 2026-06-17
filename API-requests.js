async function getCoordinates(city) {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=en&format=json&countryCode=US`);    
    const data = await response.json();
    return data;
}

async function getWeatherData(lattitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lattitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=America%2FNew_York&models=best_match`;
    const response = await fetch(url);    
    const data = await response.json();
    return data;
}

async function getWeatherDataForCity(city) {
    const coordinates = await getCoordinates(city);
    if (!coordinates.results || coordinates.results.length === 0) {
        throw new Error("City not found");
    }
    return await getWeatherData(coordinates.results[0].latitude, coordinates.results[0].longitude);
}

// document.getElementById("GetWeather").addEventListener("click", async () => {
//     const city = document.getElementById("city-input").value;
//     const coordinates = await getCoordinates(city);
//     if (!coordinates.results || coordinates.results.length === 0) {
//     document.getElementById("weather-info").innerHTML = "<p>City not found. Please try again.</p>";
//     return;
//     }
//     const weatherData = await getWeatherData(coordinates.results[0].latitude, coordinates.results[0].longitude);
//     document.getElementById("weather-info").innerHTML = `
//         <p>Temperature: ${weatherData.current.temperature_2m}°C</p>
//         <p>Wind Speed: ${weatherData.current.wind_speed_10m} m/s</p>
//     `;
// });

export { getWeatherDataForCity };