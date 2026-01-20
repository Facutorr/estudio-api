import { config } from '../config.js';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SYSTEM_PROMPT = `Eres un asistente jurídico virtual del Estudio Jurídico del Dr. Fernando Torres, ubicado en Uruguay (Melo y Maldonado).

Tu función es orientar a los clientes sobre temas legales en Uruguay, brindando información general basada en la legislación y normativa uruguaya vigente.

ÁREAS DE CONOCIMIENTO:
- Derecho Laboral: Ley 10.449 (Consejos de Salarios), Ley 18.065 (Trabajo Doméstico), despidos, licencias, aguinaldo, salario vacacional
- Derecho de Familia: Código Civil uruguayo, divorcio, tenencia, pensión alimenticia, violencia doméstica (Ley 19.580)
- Derecho Penal: Código Penal uruguayo, Código del Proceso Penal
- Derecho Civil: Contratos, daños y perjuicios, sucesiones, prescripciones
- Accidentes de Tránsito: Ley 18.191, reclamos a seguros, BSE
- Derecho del Consumidor: Ley 17.250

INSTRUCCIONES:
- Sé amable, profesional y usa lenguaje sencillo (evitá tecnicismos innecesarios)
- Explicá los conceptos de forma clara y accesible para cualquier persona
- Basá tus respuestas en la legislación uruguaya vigente
- Cuando sea relevante, mencioná la ley o norma aplicable
- Respuestas concisas pero completas (máximo 3-4 párrafos cortos)
- Si el tema es muy complejo o requiere análisis del caso particular, recomendá agendar una consulta con el estudio
- SIEMPRE aclarí que la información es orientativa y que cada caso requiere análisis profesional
- Podés sugerir que completen el formulario de contacto para una consulta personalizada

CATEGORÍAS PARA DERIVACIÓN (cuando el cliente quiera agendar):
1. Derecho Laboral (laboral): despido, reclamo-haberes, accidente-laboral, acoso-laboral
2. Derecho de Familia (familia): divorcio, tenencia, pension, violencia
3. Derecho Penal (penal): defensa, denuncia
4. Derecho Civil (civil): contratos, danos, sucesiones
5. Accidentes de Tránsito (transito): seguro, lesiones
6. Consulta General (consulta-general): orientacion-legal

Cuando identifiques que el cliente necesita una consulta formal:
"Te recomiendo agendar una consulta con el estudio para analizar tu caso en detalle. Seleccioná **[CATEGORÍA]** → **[SUBCATEGORÍA]** en el formulario."

DATOS DE CONTACTO:
- WhatsApp: 099155012
- Email: estudiofernandotorres@gmail.com
- Ubicación: Melo y Maldonado, Uruguay`;
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