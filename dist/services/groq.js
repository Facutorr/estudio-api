import { config } from '../config.js';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SYSTEM_PROMPT = `Eres un asistente jurídico virtual del Estudio Jurídico del Dr. Fernando Torres, ubicado en Uruguay (Melo y Maldonado).

Tu ÚNICA función es orientar al cliente para elegir la CATEGORÍA y SUBCATEGORÍA correcta según su problema legal. NO des asesoramiento legal específico ni respondas preguntas legales - solo ayudás a clasificar el caso.

CATEGORÍAS Y SUBCATEGORÍAS DISPONIBLES:

1. DERECHO LABORAL (laboral)
   - Despido (despido)
   - Reclamo de haberes (reclamo-haberes)
   - Accidente laboral (accidente-laboral)
   - Acoso laboral (acoso-laboral)
   - Otro tema laboral (otro)

2. DERECHO DE FAMILIA (familia)
   - Divorcio (divorcio)
   - Tenencia de hijos (tenencia)
   - Pensión alimenticia (pension)
   - Violencia doméstica (violencia)
   - Otro tema familiar (otro)

3. DERECHO PENAL (penal)
   - Defensa penal (defensa)
   - Denuncia (denuncia)
   - Otro tema penal (otro)

4. DERECHO CIVIL (civil)
   - Contratos (contratos)
   - Daños y perjuicios (danos)
   - Sucesiones/Herencias (sucesiones)
   - Otro tema civil (otro)

5. ACCIDENTES DE TRÁNSITO (transito)
   - Reclamo a seguro (seguro)
   - Lesiones personales (lesiones)
   - Otro tema de tránsito (otro)

6. CONSULTA GENERAL (consulta-general)
   - Orientación legal (orientacion-legal)
   - Otro (otro)

INSTRUCCIONES:
- Sé amable y profesional
- Hacé preguntas breves para entender el problema
- Cuando tengas suficiente información, sugerí la categoría y subcategoría apropiada
- Formato de respuesta cuando identifiques el caso:
  "Basándome en lo que me contás, tu caso corresponde a **[CATEGORÍA]** → **[SUBCATEGORÍA]**. Te recomiendo seleccionar esta opción en el formulario de contacto."
- Si el cliente tiene múltiples problemas, enfocate en el principal
- Respuestas cortas (máximo 2-3 oraciones por mensaje)
- Si no podés clasificar, sugerí "Consulta General → Orientación Legal"
- NUNCA des consejos legales específicos, solo clasificación`;
export async function chatWithGroq(userMessage, conversationHistory = []) {
    const apiKey = config.groqApiKey;
    if (!apiKey) {
        return {
            reply: 'El asistente no está disponible en este momento. Por favor, completá el formulario de contacto directamente.'
        };
    }
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature: 0.7,
                max_tokens: 300
            })
        });
        if (!response.ok) {
            console.error('Groq API error:', response.status, await response.text());
            return {
                reply: 'Hubo un error al procesar tu consulta. Por favor, intentá de nuevo o completá el formulario directamente.'
            };
        }
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || 'No pude procesar tu consulta.';
        // Intentar extraer categoría y subcategoría de la respuesta
        let category;
        let subcategory;
        // Detectar categorías mencionadas
        const categoryMap = {
            'derecho laboral': 'laboral',
            'laboral': 'laboral',
            'derecho de familia': 'familia',
            'familia': 'familia',
            'derecho penal': 'penal',
            'penal': 'penal',
            'derecho civil': 'civil',
            'civil': 'civil',
            'accidentes de tránsito': 'transito',
            'tránsito': 'transito',
            'consulta general': 'consulta-general'
        };
        const subcategoryMap = {
            'despido': 'despido',
            'reclamo de haberes': 'reclamo-haberes',
            'accidente laboral': 'accidente-laboral',
            'acoso laboral': 'acoso-laboral',
            'divorcio': 'divorcio',
            'tenencia': 'tenencia',
            'pensión alimenticia': 'pension',
            'pensión': 'pension',
            'violencia doméstica': 'violencia',
            'violencia': 'violencia',
            'defensa penal': 'defensa',
            'denuncia': 'denuncia',
            'contratos': 'contratos',
            'daños y perjuicios': 'danos',
            'daños': 'danos',
            'sucesiones': 'sucesiones',
            'herencias': 'sucesiones',
            'herencia': 'sucesiones',
            'reclamo a seguro': 'seguro',
            'seguro': 'seguro',
            'lesiones personales': 'lesiones',
            'lesiones': 'lesiones',
            'orientación legal': 'orientacion-legal'
        };
        const replyLower = reply.toLowerCase();
        for (const [key, value] of Object.entries(categoryMap)) {
            if (replyLower.includes(key)) {
                category = value;
                break;
            }
        }
        for (const [key, value] of Object.entries(subcategoryMap)) {
            if (replyLower.includes(key)) {
                subcategory = value;
                break;
            }
        }
        return { reply, category, subcategory };
    }
    catch (error) {
        console.error('Groq API error:', error);
        return {
            reply: 'Hubo un error de conexión. Por favor, intentá de nuevo.'
        };
    }
}
//# sourceMappingURL=groq.js.map