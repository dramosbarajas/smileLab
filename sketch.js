/*
  Aplicación interactiva HealthySmile Lab:
  Se encarga de detectar la apertura de la boca con face-api.js y genera unas partículas sobre los dientes.
  Cuando se completa el temporizador, congela una captura de la sonrisa con las gafas virtuales.
*/

// Declaración de variables principales
let video;
let deteccion = null;
let particulas = [];

let fondo;
let imagenGafas = [];
let gafasSeleccionadas = null;

let imagenCongelada;
let lienzoFinal;
let musica;

let bocaAbierta = false;

let tiempoSeleccionado = 30;
let tiempoRestante = 30;
let temporizadorActivo = false;
let finalizado = false;
let ultimoTiempo = 0;

const anchoVideo = 640;
const altoVideo = 480;
let xVideo, yVideo;

/*
  Precarga de imágenes y sonido antes de iniciar el sketch
*/
function preload() {
  fondo = loadImage('assets/dientesFondo.png');
  musica = loadSound('assets/kids.mp3');
  for (let i = 1; i <= 3; i++) {
    imagenGafas.push(loadImage(`assets/gafas${i}.png`));
  }
}

/*
  Configuración inicial del canvas, cámara, modelos de detección y eventos
*/
async function setup() {
  createCanvas(windowWidth, windowHeight).parent("canvas-container");
  video = createCapture(VIDEO);
  video.size(anchoVideo, altoVideo);
  video.hide();

  /* await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models')
  ]); */

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'), 
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.mtcnn.loadFromUri('/models'),          
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'), 
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'), 
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),  
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),    
    faceapi.nets.ageGenderNet.loadFromUri('/models'),        
    faceapi.nets.tinyYolov2.loadFromUri('/models')           
  ]);

  gafasSeleccionadas = random(imagenGafas);
  musica.loop();

  select("#frase").html(random([
    "¡Cepillarse es tu superpoder!", "Una sonrisa sana brilla más fuerte.",
    "¡Dientes limpios, sonrisa feliz!", "Cepillarse es divertido, ¡inténtalo!",
    "Tu boca es un tesoro, ¡cuídala!", "Cada cepillado cuenta.",
    "Dientes fuertes, niños felices.", "¡Despierta tu sonrisa con cepillo!",
    "Dos veces al día, cada día.", "Cepillar es jugar a estar sanos."
  ]));

  select("#botonControl").mousePressed(controlarTemporizador);

  select("#tiempo").changed(() => {
    tiempoSeleccionado = int(select("#tiempo").value());
    tiempoRestante = tiempoSeleccionado;
    select("#temporizador").html(`Tiempo restante: ${tiempoRestante}s`);
  });

  select("#guardarCaptura").mousePressed(() => {
    if (lienzoFinal) save(lienzoFinal, "mi_sonrisa_con_gafas.png");
  });

  calcularPosicionVideo();
  frameRate(30);
}

/*
 Reajustar el tamñao del canvas a la ventana
*/
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calcularPosicionVideo();
}

/*
 Calculo la posicion del video
*/
function calcularPosicionVideo() {
  xVideo = (width - anchoVideo) / 2;
  yVideo = 150;
}

/*
  Dibuja la funcion principal
*/
function draw() {
  image(fondo, 0, 0, width, height);

  if (finalizado && imagenCongelada) {
    image(imagenCongelada, xVideo, yVideo, anchoVideo, altoVideo);
  } else {
    image(video, xVideo, yVideo, anchoVideo, altoVideo);
  }

  if (!finalizado && video.loadedmetadata) detectarCara();

  if (bocaAbierta && temporizadorActivo && !finalizado) {
    generarParticulas();
    actualizarTemporizador();
  }

  mostrarParticulas();

  if (gafasSeleccionadas && deteccion) {
    dibujarGafas();
  }
}

/*
  Detección de la cara y apertura de boca usando face-api.js
*/
async function detectarCara() {
  const resultado = await faceapi
    .detectSingleFace(video.elt, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true);

  if (resultado) {
    deteccion = resultado;
    const boca = deteccion.landmarks.getMouth();
    const separacion = boca[19].y - boca[13].y;
    bocaAbierta = separacion > 20;
  }
}

/*
  Genero las particulas al abrir la boca
*/
function generarParticulas() {
  const boca = deteccion.landmarks.getMouth();
  for (let i = 48; i <= 59; i++) {
    const pt = boca[i - 48];
    const x = map(pt.x, 0, video.width, xVideo, xVideo + anchoVideo);
    const y = map(pt.y, 0, video.height, yVideo, yVideo + altoVideo);
    particulas.push(new Particle(
      x + random(-30, 30),
      y,
      random(-2, 2),
      random(-3, -1)
    ));
  }
}

/*
  Actualiza particulas
*/
function mostrarParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    particulas[i].actualizar();
    particulas[i].mostrar();
    if (particulas[i].isDead()) particulas.splice(i, 1);
  }
}

/*
  Actualiza el temporizador cada segundo
*/
function actualizarTemporizador() {
  if (millis() - ultimoTiempo >= 1000) {
    tiempoRestante--;
    ultimoTiempo = millis();
    select("#temporizador").html(`Tiempo restante: ${tiempoRestante}s`);
    if (tiempoRestante <= 0) finalizarTemporizador();
  }
}

/*
  Congelo la img con las gafas para gamificar la sonrisa y que pueda guardarse 
*/
function finalizarTemporizador() {
  temporizadorActivo = false;
  finalizado = true;

  lienzoFinal = createGraphics(anchoVideo, altoVideo);
  lienzoFinal.image(video, 0, 0, anchoVideo, altoVideo);
  if (deteccion && gafasSeleccionadas) {
    const ojos = deteccion.landmarks;
    const izq = ojos.getLeftEye()[0];
    const der = ojos.getRightEye()[3];
    const cx = (izq.x + der.x) / 2;
    const cy = (izq.y + der.y) / 2;
    const distOjos = dist(izq.x, izq.y, der.x, der.y);
    const w = distOjos * 2.5;
    const h = w * (gafasSeleccionadas.height / gafasSeleccionadas.width);
    const px = map(cx, 0, video.width, 0, anchoVideo);
    const py = map(cy, 0, video.height, 0, altoVideo);
    lienzoFinal.image(gafasSeleccionadas, px - w/2, py - h/2, w, h);
  }
  imagenCongelada = lienzoFinal;

  select("#mensajeFinal").style("display", "block");
  select("#fechaActual").html(`📅 Fecha: ${new Date().toLocaleDateString("es-ES")}`);
  select("#datosFinales").style("display", "block");
  select("#botonControl").html("Reiniciar");

  if (musica.isPlaying()) musica.stop();
}

/*
  Controles del inicio y reinicio del temporizador
*/
function controlarTemporizador() {
  if (!temporizadorActivo && !finalizado) {
    tiempoSeleccionado = int(select("#tiempo").value());
    tiempoRestante = tiempoSeleccionado;
    temporizadorActivo = true;
    ultimoTiempo = millis();
    imagenCongelada = null;
    finalizado = false;
    particulas = [];
    select("#mensajeFinal").style("display", "none");
    select("#datosFinales").style("display", "none");
    select("#botonControl").html("Reiniciar");
    if (!musica.isPlaying()) musica.loop();
  } else {
    temporizadorActivo = false;
    finalizado = false;
    imagenCongelada = null;
    particulas = [];
    select("#mensajeFinal").style("display", "none");
    select("#datosFinales").style("display", "none");
    select("#botonControl").html("Iniciar");
    if (musica.isPlaying()) musica.stop();
  }
  select("#temporizador").html(`Tiempo restante: ${tiempoRestante}s`);
}

/*
  Dibujo las gafas sobre la cara
*/
function dibujarGafas() {
  const ojoIzq = deteccion.landmarks.getLeftEye()[0];
  const ojoDer = deteccion.landmarks.getRightEye()[3];
  const cx = (ojoIzq.x + ojoDer.x) / 2;
  const cy = (ojoIzq.y + ojoDer.y) / 2;
  const distOjos = dist(ojoIzq.x, ojoIzq.y, ojoDer.x, ojoDer.y);
  const w = distOjos * 2.5;
  const h = w * (gafasSeleccionadas.height / gafasSeleccionadas.width);
  const px = map(cx, 0, video.width, xVideo, xVideo + anchoVideo);
  const py = map(cy, 0, video.height, yVideo, yVideo + altoVideo);

  image(gafasSeleccionadas, px - w/2, py - h/2, w, h);
}

/*
  Clase que define como funcionan las particulas.
*/
class Particle {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.alpha = 255;
    this.size = random(4, 8);
    this.color = color(
      random(100, 255),
      random(100, 255),
      random(100, 255),
      this.alpha
    );
  }

  actualizar() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 3;
  }

  mostrar() {
    noStroke();
    fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.alpha);
    ellipse(this.x, this.y, this.size);
  }

 // Controlo si ya no se estan mostrando particulas.
  isDead() {
    return this.alpha <= 0;
  }
}