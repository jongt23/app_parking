document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    let bestSpanishVoice = null;

    // Función para encontrar y seleccionar la mejor voz en español disponible en el navegador.
    function findBestVoice() {
        const voices = speechSynthesis.getVoices();
        // Damos prioridad a las voces de "Google" o "Microsoft" porque suelen ser de mayor calidad.
        bestSpanishVoice = voices.find(voice => voice.lang.startsWith('es') && voice.name.includes('Google')) ||
                           voices.find(voice => voice.lang.startsWith('es') && voice.name.includes('Microsoft')) ||
                           voices.find(voice => voice.lang.startsWith('es'));

        if (bestSpanishVoice) {
            console.log('Voz de alta calidad seleccionada:', bestSpanishVoice.name);
        }
    }

    // Las voces se cargan de forma asíncrona, así que escuchamos el evento 'voiceschanged'.
    speechSynthesis.addEventListener('voiceschanged', findBestVoice);
    findBestVoice(); // Intento inicial por si ya están cargadas.

    if (recognition) {
        recognition.lang = 'es-ES'; // Se puede ajustar o detectar dinámicamente
        recognition.interimResults = false;
    }

    // --- EVENT LISTENERS ---
    sendBtn.addEventListener('click', handleUserRequest);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleUserRequest();
        }
    });
    micBtn.addEventListener('click', toggleMic);

    // --- FUNCTIONS ---

    function handleUserRequest() {
        const text = userInput.value.trim();
        if (text) {
            addMessage(text, 'user');
            userInput.value = '';
            getAIResponse(text);
        }
    }

    function toggleMic() {
        if (!recognition) {
            // Mejora: Mostrar el error en el chat en lugar de un alert.
            addMessage('Lo siento, el reconocimiento de voz no es compatible con este navegador. Por favor, usa Google Chrome o Microsoft Edge y asegúrate de que la página se sirve desde un servidor web (no como un archivo local).', 'bot');
            micBtn.disabled = true;
            micBtn.style.opacity = '0.6';
            micBtn.style.cursor = 'not-allowed';
            return;
        }
        if (micBtn.classList.contains('listening')) {
            recognition.stop();
            micBtn.classList.remove('listening');
        } else {
            recognition.start();
            micBtn.classList.add('listening');
        }

        recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript;
            addMessage(spokenText, 'user');
            getAIResponse(spokenText, true); // true para auto-hablar
        };

        recognition.onend = () => {
            micBtn.classList.remove('listening');
        };

        recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            micBtn.classList.remove('listening');
        };
    }

    function addMessage(text, sender, autoSpeak = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        
        const p = document.createElement('p');
        p.textContent = text;
        messageElement.appendChild(p);

        if (sender === 'bot') {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'speak-btn';
            speakBtn.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
            speakBtn.onclick = () => speak(text);
            messageElement.appendChild(speakBtn);

            if (autoSpeak) {
                speak(text);
            }
        }

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement; // Devolvemos el elemento para poder manipularlo después
    }

    function speak(text) {
        // Detener cualquier locución anterior para evitar que se solapen.
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';

        // Si encontramos una voz de alta calidad, la usamos.
        if (bestSpanishVoice) {
            utterance.voice = bestSpanishVoice;
        }
        speechSynthesis.speak(utterance);
    }

    async function getAIResponse(userText, autoSpeak = false) {
        // El contexto del parking ahora se carga desde el archivo context.js
        // y está disponible globalmente como la variable 'parkingContext'.

        // --- LLAMADA A LA API DE IA REAL ---
        console.log('Enviando a IA:', userText);
        const thinkingMessage = addMessage('Pensando...', 'bot'); // Guardamos referencia al mensaje "escribiendo..."

        // CORRECCIÓN: Cambiamos al modelo gemini-1.5-flash-latest, que es más moderno y puede tener mayor disponibilidad.
        // También ajustamos la estructura del body para usar "systemInstruction", que es la forma recomendada de dar contexto.
        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
        const API_KEY = 'AIzaSyDWExn7DOXT8OfvxKPoOxIf92fwHGNTfPE'; // TU API KEY REAL

        try {
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // Estructura recomendada para modelos Gemini 1.5
                    "systemInstruction": {
                        "parts": [{ "text": parkingContext }]
                    },
                    "contents": [{
                        "role": "user",
                        "parts": [{ "text": userText }]
                    }]
                })
            });

            // Eliminamos el mensaje "Pensando..." tan pronto como tengamos una respuesta, antes de procesarla.
            if (thinkingMessage) {
                chatBox.removeChild(thinkingMessage);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'No se pudo leer el cuerpo del error.' }));
                console.error('Detalles del error de la API:', errorData);
                throw new Error(`Error en la respuesta de la API: ${response.status}`);
            }

            const data = await response.json();
            // Comprobación robusta de que la respuesta tiene el formato esperado
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                const aiText = data.candidates[0].content.parts[0].text;
                addMessage(aiText, 'bot', autoSpeak);
            } else {
                console.warn('La API no devolvió candidatos o la respuesta estaba vacía. Respuesta completa:', data);
                addMessage('No he podido generar una respuesta para eso. Intenta con otra pregunta.', 'bot');
            }
        } catch (error) {
            console.error('Error al contactar la IA:', error);
            if (thinkingMessage && thinkingMessage.parentNode) { // Si el mensaje "Pensando..." aún existe, lo eliminamos
                chatBox.removeChild(thinkingMessage);
            }
            addMessage('Lo siento, no puedo responder en este momento.', 'bot');
        }
    }
});
