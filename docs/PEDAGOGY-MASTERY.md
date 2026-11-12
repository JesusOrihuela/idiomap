# Dominio por cobertura y compositor de sesión

> Documento de diseño pedagógico. Define qué significa "dominar" cuando el
> contenido pasa por varios tipos de ejercicio y cómo se compone una sesión con
> el catálogo nuevo. Complementa [PEDAGOGY-COVERAGE.md](PEDAGOGY-COVERAGE.md) y
> [PEDAGOGY-AUDIT.md](PEDAGOGY-AUDIT.md).

## 1. Transferencia interna y dominio

La transferencia al mundo real queda fuera de alcance. La transferencia que sí
se puede medir es **interna**: el mismo contenido aparece en distintos tipos de
ejercicio y se comprueba si el alumno lo usa fuera del ejercicio original.

Eso es **near transfer** y **task transfer**. No es far transfer.

### "Pasó por todos los tipos" no es suficiente

La idea es buena, pero literalmente "todos los tipos" tiene tres problemas:

1. **No todos los tipos aplican a todo el contenido.** Un vocab-only no necesita
   una tarea de conversación; una frase A1 no necesita mediación.
2. **Pasar por un ejercicio no es evidencia.** Ver una tarjeta, girarla o
   completar un cloze con ayuda no demuestra dominio.
3. **Falta retención.** Acertar hoy no es dominar; hay que volver a acertar
   después, sin apoyo.

La formulación mejor es:

> El contenido se domina cuando hay **evidencia independiente** en el conjunto
> de dimensiones requerido para ese tipo de contenido, y se mantiene en el
> tiempo.

No es "todos los ejercicios"; es "todas las evidencias requeridas".

### Dimensiones de evidencia

| Dimensión | Qué demuestra |
|---|---|
| `recognition` | Reconoce el significado o la forma |
| `comprehension` | Lo entiende en audio o lectura |
| `controlled_production` | Lo produce con apoyo de formato |
| `open_production` | Lo produce sin texto objetivo |
| `retention` | Lo recuerda y usa después de días o semanas |

### Perfiles por tipo de contenido

Ejemplo, a validar con contenido real:

| Contenido | Evidencias requeridas |
|---|---|
| Vocabulario | `recognition`, `controlled_production`, `retention`; `open_production` opcional |
| Frase | `comprehension`, `controlled_production`, `open_production`, `retention` |
| Gramática | `recognition`, `controlled_production`, `open_production`, `retention` |
| Tarea | `controlled_production` o `open_production`, según el nivel; `retention` |

No todos los ítems necesitan las cinco dimensiones. El perfil se define por tipo
de contenido y nivel.

### Evidencia, no exposición

| Estado | Qué significa |
|---|---|
| `exposed` | Lo vio o lo completó, con o sin ayuda |
| `practiced` | Lo practicó, pero con apoyo o sin criterio de calidad |
| `evidenced` | Lo hizo sin apoyo, por encima del umbral |
| `mastered` | Tiene todas las evidencias requeridas y retención |

- `exposed` no cuenta para mastery.
- `practiced` cuenta como ámbar, no como verde.
- `evidenced` cuenta para la dimensión, no necesariamente para mastery.
- `mastered` solo cuando el perfil está completo.

### Reglas

- Una actividad puede evidenciar una o varias dimensiones.
- Una dimensión no se da por cubierta con una sola actividad si el perfil pide
  más de una evidencia.
- La evidencia debe ser **independiente**: sin pista, sin respuesta visible, sin
  corrección inmediata.
- La retención se mide con un repaso diferido, no con el mismo intento.
- El mastery se calcula por ítem y por tema, no por promedio de actividades.
- El mastery no se otorga por "pasó por el ejercicio"; se otorga por evidencia.

## 2. Compositor de sesión

Con más actividades, la ruta no puede ser una lista fija. Necesita un
**compositor**: un motor que elige qué actividades entran en cada sesión.

### Entradas

| Entrada | Para qué |
|---|---|
| Actividades disponibles | Qué se puede programar |
| Cobertura y mastery | Qué falta por evidenciar |
| Repasos vencidos | Spacing |
| Tiempo disponible | Sesión de 20 minutos |
| Prerrequisitos | Qué debe ir antes |
| Interleaving | No repetir el mismo tipo |
| Práctica abierta | Cadencia por unidad o tema |
| Evaluador | Solo si está validado para esa tarea |
| Preferencias | Elección dentro de la estructura |
| Dispositivo | Audio, modelo, almacenamiento |

### Reglas iniciales

1. Sesión de 3-5 actividades, 20 minutos.
2. Al menos un repaso espaciado.
3. Cubrir 2-3 hebras por sesión.
4. No repetir la misma familia dos veces seguidas.
5. Práctica controlada antes de práctica abierta.
6. Práctica abierta al menos una vez por unidad o tema.
7. Cerradas con SRS; abiertas con calendario de práctica.
8. Actividades con evaluador solo si `evidenceLevel: validated`.
9. Si falta modelo, audio o evaluador, fallback a la actividad cerrada.
10. El alumno puede elegir, pero no puede saltarse la cobertura mínima.

### Salida

```json
{
  "sessionId": "ses_...",
  "estimatedMinutes": 20,
  "activities": [
    { "activityId": "vocab.practice.negotiate", "reason": "repaso vencido" },
    { "activityId": "grammar.fillgap.past_simple", "reason": "cobertura" },
    { "activityId": "listening.dictation.hotel", "reason": "input" },
    { "activityId": "speaking.guided.hotel", "reason": "producción controlada" },
    { "activityId": "speaking.open.hotel", "reason": "práctica abierta" }
  ]
}
```

### Escalabilidad

- **Registro de actividades**, no lista hardcodeada. Cada actividad declara
  familia, destreza, dimensiones de evidencia, duración, prerrequisitos y
  necesidades.
- **Motor de reglas determinista** al principio. No hace falta ML para componer
  una sesión pedagógicamente sensata.
- **Metadatos** suficientes para que una actividad nueva entre sin tocar el
  compositor.
- **Tests**: una sesión nunca debe superar el tiempo, repetir familia, saltarse
  un prerrequisito o incluir una actividad con evaluador no validado.
- **Adaptación posterior**: cuando haya datos, se pueden ajustar pesos; no
  empezar por ahí.

## 3. Gobernanza del evaluador: después

La gobernanza depende de que exista una forma de evaluar. No tiene sentido
construir el aparato completo antes.

### Antes del evaluador

- No hay `validated`; la práctica abierta es `practice`.
- No hay mastery de producción abierta.
- Solo se guardan intentos, audio y auto-valoración.
- Privacidad y borrado de audio son lo único que hay que cuidar.

### Piloto mínimo cuando aparezca un evaluador

- Una tarea y un idioma.
- 100-200 respuestas etiquetadas por humanos.
- Precisión, recall, falsos positivos y negativos.
- Umbral y estado "no evaluable".
- Versión del evaluador.
- Revisión humana por muestreo.
- Consentimiento si es remoto.

### Gobernanza completa, solo si el piloto funciona

- Sesgos por acento, variedad y nivel.
- Apelaciones y revisión humana.
- Monitorización y deriva.
- Recalibración por versión.
- Coste, latencia y rollback.
- Comunicación clara: "evaluado" vs "práctica".

## 4. Conclusión

- **Transferencia interna:** sí, el contenido debe aparecer en varias
  dimensiones; no en todos los ejercicios por obligación.
- **Dominio:** no es "pasó por todos"; es "evidenció lo requerido, sin apoyo, y
  lo retiene".
- **Compositor:** necesario y escalable; empezar con reglas, no con ML.
- **Gobernanza:** después del evaluador; antes, solo práctica y privacidad.

El orden correcto es:

1. Modelo de evidencia por dimensiones.
2. Compositor de sesión.
3. Práctica abierta con referencias y auto-chequeo.
4. Evaluador validado.
5. Gobernanza completa.
