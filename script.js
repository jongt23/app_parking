document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

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
            alert('El reconocimiento de voz no es compatible con este navegador.');
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
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        // La API puede devolver el código de idioma (ej. 'en-US', 'es-ES')
        // Aquí lo forzamos a español para la simulación.
        utterance.lang = 'es-ES'; 
        speechSynthesis.speak(utterance);
    }

        async function getAIResponse(userText, autoSpeak = false) {
        // --- CONTEXTO DEL PARKING ---
        const parkingContext = `
            Eres un asistente virtual de un parking moderno e inteligente.
            Tu nombre es Parky. Responde de forma breve y amable.
            Contexto del parking:
            - Hay 3 plantas: P1 (azul), P2 (verde), P3 (naranja).
            - P1 es para vehículos eléctricos y tiene 20 cargadores.
            - P2 es para familias y tiene plazas anchas.
            - P3 es general.
            - Precios: 2€/hora para coches, 1€/hora para motos. Los eléctricos tienen 30 min gratis.
            - Horario: 24/7.
            - No se puede reservar plaza.
            - Para entrar, la barrera lee tu matrícula. Para salir, pagas en el cajero o con la app 'ParkyPay'.
        `;

        // --- LLAMADA A LA API DE IA REAL ---
        console.log('Enviando a IA:', userText);
        addMessage('Pensando...', 'bot'); // Mensaje de "escribiendo..."

        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'; // URL del endpoint de Gemini Pro
        const API_KEY = 'AIzaSyDWExn7DOXT8OfvxKPoOxIf92fwHGNTfPE'; // TU API KEY REAL

        try {
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        { parts: [{ text: parkingContext + "\n\nUsuario: " + userText }] }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta de la API');
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            
            // Eliminar el mensaje "Pensando..."
            const allMessages = chatBox.querySelectorAll('.bot-message');
            chatBox.removeChild(allMessages[allMessages.length - 1]);

            addMessage(aiText, 'bot', autoSpeak);

        } catch (error) {
            console.error('Error al contactar la IA:', error);
            addMessage('Lo siento, no puedo responder en este momento.', 'bot');
        }
    }
});
