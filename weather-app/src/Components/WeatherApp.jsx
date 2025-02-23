import React, { useState, useEffect } from 'react';
import slonce from '../assets/images/slonce-removebg-preview.png';
import chmury from '../assets/images/chmury-removebg-preview.png';
import deszcz from '../assets/images/deszcz-removebg-preview.png';
import snieg from '../assets/images/snieg-removebg-preview.png';
import mgla from '../assets/images/mgla-removebg-preview.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './WeatherApp.css';

const WeatherApp = () => {
    const [data, setData] = useState({}); // dane pogodowe dal aktualnej lokanizacj
    const [location, setLocation] = useState(''); // lokalizacja podana przez uzytkownoka
    const [weeklyData, setWeeklyData] = useState([]); // dane na najblizsze kilka dni
    const [error, setError] = useState(null); // komunikat o bledzie

    // klucz api od pogody [https://openweathermap.org/api]
    const api_key = '333ef7aff618861a8786cda51780388f';

    // funkcja do zamiany wspolrzednych na adres
    // szerokosc i dlugosc <- arg
    const reverseGeocode = async (lat, lon) => {
        const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=3fe1582997f54a499d1de4357e9bd8fd`;
        // pobieram dane z api albo zwracam null
        try {
            const response = await fetch(url);
            const data = await response.json();
            const address = data.features[0].properties.formatted;
            return address || null;
        } catch (err) {
            console.error("Błąd podczas Reverse Geocoding:", err);
            return null;
        }
    };

    // funkcja do pobierania danych pogodowych
    const fetchWeather = async (query, isCoords = false) => {
        // zalezne od tego czy podano wspolrzedne czy nazwe miasta
        const url = isCoords
            ? `https://api.openweathermap.org/data/2.5/weather?lat=${query.lat}&lon=${query.lon}&units=Metric&appid=${api_key}`
            : `https://api.openweathermap.org/data/2.5/weather?q=${query}&units=Metric&appid=${api_key}`;

        try {
            // pobieram dane z api
            const response = await fetch(url);
            const weatherData = await response.json();
            // jak dane beda poprawne to pobieram dane
            if (weatherData.cod === 200) {
                // jak podano wspolrzedne to pobieram adres
                if (isCoords) {
                    const address = await reverseGeocode(query.lat, query.lon);
                    weatherData.address = address || weatherData.name;
                }
                setData(weatherData);
                setError(null);
                fetchWeeklyWeather(query, isCoords);
            } else {
                // odpowiednie bledy
                setError("Nie znaleziono lokalizacji");
                setData({});
                setWeeklyData([]);
            }
        } catch (err) {
            setError("Wystąpił błąd podczas pobierania danych");
            console.error(err);
        }
    };

    // funkcja do pobierania danych pogodowych na najblizsze kilka dni
    const fetchWeeklyWeather = async (query, isCoords = false) => {
        // zalezne od tego czy podano wspolrzedne czy nazwe miasta
        const url = isCoords
            ? `https://api.openweathermap.org/data/2.5/forecast?lat=${query.lat}&lon=${query.lon}&units=Metric&appid=${api_key}`
            : `https://api.openweathermap.org/data/2.5/forecast?q=${query}&units=Metric&appid=${api_key}`;

        const response = await fetch(url);
        const weeklyData = await response.json();
        if (weeklyData.cod === "200") {
            const groupedData = groupDataByDay(weeklyData.list);
            setWeeklyData(groupedData);
        }
    };

    // funkcja do grupowania danych pogodowych na najblizsze kilka dni
    const groupDataByDay = (data) => {
        if (!data || !Array.isArray(data)) return [];

        const groupedByDate = data.reduce((acc, item) => {
            const date = item.dt_txt.split(' ')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(item.main.temp);
            return acc;
        }, {});

        return Object.keys(groupedByDate).map((date) => {
            const temps = groupedByDate[date];
            const avgTemp = (temps.reduce((total, temp) => total + temp, 0) / temps.length).toFixed(1);
            return { date, avgTemp };
        }).slice(0, 7);
    };


    useEffect(() => {
        if (navigator.geolocation) {
            // pobieram lokalizacje uzytkownika lub domyslnie Torun
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    await fetchWeather({ lat: latitude, lon: longitude }, true);
                },
                (error) => {
                    console.error("Błąd podczas pobierania lokalizacji:", error);
                    fetchWeather("Torun");
                }
            );
        } else {
            fetchWeather("Torun");
        }
    }, []);

    // funkcja do wyszukiwania lokalizacji
    const search = async () => {
        if (location.trim()) fetchWeather(location);
        setLocation('');
    };

    // obiekty z obrazkami i kolorami tla dla pogody
    const weatherImages = { Clear: slonce, Clouds: chmury, Rain: deszcz, Snow: snieg, Mist: mgla };
    const backgroundImages = {
        Clear: 'linear-gradient(to bottom, #FFD700, #FFA500)',
        Clouds: 'linear-gradient(to bottom, #A9A9A9, #D3D3D3)',
        Rain: 'linear-gradient(to bottom, #0000FF, #ADD8E6)',
        Snow: 'linear-gradient(to bottom, #FFFFFF, #F0F0F0)',
        Mist: 'linear-gradient(to bottom, #D3D3D3, #A9A9A9)',
    };

    // wybieram odpowiednie obrazki i kolory tla
    const weatherImage = data.weather ? weatherImages[data.weather[0].main] : null;
    const backgroundImage = data.weather ? backgroundImages[data.weather[0].main] : 'linear-gradient(to bottom, #FFD700, #FFA500)';

    // ustawiam tlo strony
    useEffect(() => {
        document.body.style.backgroundImage = backgroundImage;
    }, [backgroundImage]);

    // wybor odpowiedniej daty
    const currentDate = new Date();
    const days = ['niedziela', 'poniedzialek', 'wtorek', 'sroda', 'czwartek', 'piatek', 'sobota'];
    const months = ['styczen', 'luty', 'marzec', 'kwiecien', 'maj', 'czerwiec', 'lipiec', 'sierpien', 'wrzesien', 'pazdziernik', 'listopad', 'grudzien'];
    const fullDate = `${days[currentDate.getDay()]}, ${currentDate.getDate()} ${months[currentDate.getMonth()]}`;

    // renderowanie całego komponentu aplikacji
    return (
        <div className="container-fluid d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4 w-50 rounded-5 border border-white border-2" style={{ backgroundColor: "rgba(152, 152, 152, 0.8)" }}>
                <div className="search mb-3">
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-geo-alt-fill fs-3 text-white"></i>
                        <div className="fs-3 text-white">{data.address || data.name}</div>
                    </div>
                    <div className="search_bar position-relative">
                        <input
                            type="text"
                            className="form-control bg-transparent border-3 border-white rounded-pill text-white"
                            placeholder="Podaj Lokalizacje"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && search()}
                        />
                        <i className="bi bi-search position-absolute top-50 end-0 translate-middle-y me-2 text-white cursor-pointer" onClick={search}></i>
                    </div>
                </div>
                {error ? (
                    <div className="fs-3 text-white text-center mt-4">{error}</div>
                ) : (
                    <>
                        <div className="weather text-center">
                            <div className="fs-2 text-white mb-3">dzis - {fullDate}</div>
                            <img src={weatherImage} alt="zdj" className="img-fluid mb-3" />
                            <div className="fs-2 text-white mb-2">{data.weather?.[0].main}</div>
                            <div className="fs-3 text-white d-flex justify-content-center gap-2 mb-3">
                                {data.main && <><span>{data.main.temp}°C</span> / <span>{data.main.feels_like}°C</span></>}
                            </div>
                        </div>
                        <div className="fs-2 text-white d-flex justify-content-center align-items-center gap-2 mb-3">
                            <div>Wilgotnosc</div>
                            <i className="bi bi-droplet-fill"></i>
                            <div>{data.main?.humidity}%</div>
                        </div>
                        <div className="mt-4">
                            <h3 className="fs-2 text-white mb-3">Prognoza na tydzien</h3>
                            <table className="table table-bordered table-hover text-center">
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: "rgba(250, 248, 248, 0.405)", color: "white" }}>Dzien</th>
                                        <th style={{ backgroundColor: "rgba(250, 248, 248, 0.405)", color: "white" }}>Temp. (°C)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyData.map((day, index) => {
                                        const dateObj = new Date(day.date);
                                        const dayName = days[dateObj.getDay()];
                                        const monthName = months[dateObj.getMonth()];
                                        return (
                                            <tr key={index}>
                                                <td style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", color: "white" }}>{`${dayName}, ${dateObj.getDate()} ${monthName}`}</td>
                                                <td style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", color: "white" }}>{day.avgTemp}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default WeatherApp;