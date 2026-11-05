# Calculadora de gasolina

Web con ruta por paradas, cálculo de km, precio oficial de carburante en España y reparto del coste entre pasajeros.

```
public/index.html        La web (lo que ve el usuario)
functions/api/ruta.js    Calcula los km con OpenRouteService (esconde tu clave)
functions/api/precio.js  Precio medio por provincia (Ministerio, sin clave)
```

## Puesta en marcha, paso a paso (gratis)

### 1. Consigue la clave de rutas
1. Entra en https://openrouteservice.org y crea una cuenta.
2. En el panel crea un token (plan gratuito) y cópialo. Mira los límites diarios y las condiciones de uso vigentes.

### 2. Sube el proyecto a GitHub
1. Crea una cuenta en https://github.com y un repositorio nuevo (por ejemplo `calculadora-gasolina`).
2. Pulsa "uploading an existing file" y sube las carpetas `public` y `functions` y este README.
   Deben quedar en la raíz del repositorio.

### 3. Publícalo en Cloudflare Pages
1. Crea una cuenta en https://dash.cloudflare.com
2. Workers & Pages → Create → Pages → Connect to Git y elige tu repositorio.
3. Configuración de compilación:
   - Framework preset: None
   - Build command: (vacío)
   - Build output directory: `public`
4. Pulsa Save and Deploy.

### 4. Añade la clave (muy importante)
1. En tu proyecto de Pages: Settings → Variables and Secrets.
2. Añade una variable llamada `ORS_API_KEY` con tu token (tipo Secret) en Production.
3. Vuelve a desplegar (Deployments → Retry deployment) para que la coja.

### 5. Pruébalo
Abre la dirección `tu-proyecto.pages.dev`, pon una ruta, pulsa "Calcular distancia" y luego "Usar el precio medio de la zona".

### 6. Dominio propio (opcional)
Compra un dominio (en Cloudflare, Namecheap, etc.) y asócialo en Custom domains del proyecto.

## Antes de ganar dinero
- **Privacidad y cookies**: si pones anuncios (AdSense) necesitas aviso de cookies y política de privacidad (RGPD).
- **Condiciones de uso**: revisa las de OpenRouteService antes de usar la web de forma comercial.
- **Abuso**: activa el límite de peticiones en Cloudflare (Security → WAF → Rate limiting) para que nadie agote tu cuota.
- **Posicionamiento**: añade más texto útil (guías de consumo, trucos para ahorrar) para aparecer en Google.

## Nota
Las funciones se probaron con datos simulados, no contra los servicios reales. Si el precio o la ruta fallan en la web, la página deja escribir los valores a mano y se puede ajustar el código.
