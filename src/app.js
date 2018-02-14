import THREE from "three";
import WindowResize from "three-window-resize";
import Stats from "stats";
import Renderer from "./imports/Renderer";
import Camera from "./imports/Camera";
import BowlingSound from "./imports/BowlingSound";
import Light from "./imports/Light";
import Room from "./imports/Room";
import BowlingBall from "./imports/BowlingBall";


// Constants
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const MAX_JOGADAS = 10;

// Global variables


//Variaveis locais
let pontos, flagspace = false;
let count = 0, countAnimacaoPinos = 0;
let bola, pivotBola, pista; const pinos = new Array(10); //Objetos
let relogio, discoRelogio, aroRelogio, pivotHoras, pivotMinutos, pivotSegundos; //Objeto relogio
let relogioHora, relogioMinuto, relogioSegundo; //Variáveis do relogio
let jogadas = 0, canaleta = false, pinosAtingidos = false, pinosReset = false;
const porcentagemCarregamento = 0;

let debug = false, lightHelper;
const loader = new THREE.AudioLoader();
const loadingManager = new THREE.LoadingManager();
const jsonLoader = new THREE.JSONLoader(loadingManager);
const textureLoader = new THREE.TextureLoader(loadingManager);
let stats; //Status do webGL

document.addEventListener(`DOMContentLoaded`, () => {
	init();

	loadingManager.onLoad = function() {
		animate();
	};

});


function init() {
	console.log(`Iniciando aplicação`);


	const onProgress = function ( xhr ) {
		if ( xhr.lengthComputable ) {
			if(debug) {
				console.log(Math.round(porcentagemCarregamento, 2) + `% carregado`);
			}
		}
	};

	// Setting up basic stuff
	const scene = new THREE.Scene();

	const renderer = new Renderer(WIDTH, HEIGHT);
	document.body.appendChild(renderer.domElement);

	const camera = new Camera(WIDTH, HEIGHT, scene);
	scene.add(camera);

	const audioListener = new THREE.AudioListener();
	camera.add(audioListener);

	const bowlingSound = new BowlingSound(audioListener, loader);
	scene.add(bowlingSound);

	const luz = new Light();
	scene.add(luz.target);
	scene.add(luz);

	const lightHelper = new THREE.SpotLightHelper( luz );
	lightHelper.light.target.position = luz.target.position;
	scene.add( new THREE.AmbientLight( 0x444444 ) );

	// Putting objects into the scene
	const room = new Room(textureLoader, onProgress);
	scene.add(room);

	const commands = new Board(`comandos`, textureLoader, onProgress, `Comandos`);
	commands.setPosition(-295, 350, 108);
	scene.add(commands);

	const integrantes = new Board(`integrantes`, textureLoader, onProgress, `Integrantes`);
	integrantes.setPosition(-295, 141, 108);
	scene.add(integrantes);

	const ball_textures = [
		`blue.jpg`,
		`fantasy.jpg`,
		`lava.jpg`
	];
	const ball = new BowlingBall(ball_textures[THREE.Math.randInt(0, ball_textures.length-1)]);
	scene.add(ball);

	textureLoader.load( `textures/alley.jpg`, texture => {
		const geometry = new THREE.BoxGeometry( 300, 600, 0);
		const material = new THREE.MeshPhongMaterial({map:texture});
		const pista = new THREE.Mesh( geometry, material );
		pista.position.set(0,0,-200);
		pista.rotateX( 90 * Math.PI / 180 );
		pista.receiveShadow = true;
		scene.add(pista);
		console.log(`Pista carregada`);
	}, onProgress);

	//pinos
	jsonLoader.load( `js/models/bowling-pin.json`, ( geometry, materials ) => {
		const material = materials[1];
		material.morphTargets = true;
		material.color.setHex( 0xff0000 );

		const faceMaterial = new THREE.MultiMaterial( materials );

		for( let i = 0, xpinos1 = -60, xpinos2 = -40, xpinos3 = -20; i < 10; i++) {
			pinos[i] = new THREE.Mesh( geometry, faceMaterial );
			pinos[i].castShadow = true;
			pinos[i].scale.set( 15, 15, 15);

			pinos[i].position.y = 41;

			if(i > 5) {
				pinos[i].position.z = -450;
				pinos[i].position.x = xpinos1;
				xpinos1 += 40;
			}
			else if(i > 2) {
				pinos[i].position.z = -420;
				pinos[i].position.x = xpinos2;
				xpinos2 += 40;
			}
			else if(i > 0) {
				pinos[i].position.z = -390;
				pinos[i].position.x = xpinos3;
				xpinos3 += 40;
			}
			else
				pinos[i].position.z = -360;

			scene.add(pinos[i]);
		}
	}, onProgress);

	//Relogio
	relogio = new THREE.Clock();
	discoRelogio = new THREE.Mesh(
		new THREE.CircleGeometry(60, 60),
		new THREE.MeshBasicMaterial({ color:0xffffff, side: THREE.DoubleSide })
	);
	discoRelogio.position.set(0, 300, -495);
	scene.add(discoRelogio);
	aroRelogio = new THREE.Mesh(
		new THREE.TorusGeometry(60, 5, 10, 100),
		new THREE.MeshBasicMaterial({ color:0x111111 })
	);
	aroRelogio.position.set(0, 300, -495);
	scene.add(aroRelogio);


	//Pivots para os ponteiros do relogio
	pivotHoras = new THREE.Object3D();
	pivotHoras.position.set(0, 300, -495);
	scene.add(pivotHoras);
	pivotMinutos = new THREE.Object3D();
	pivotMinutos.position.set(0, 300, -495);
	scene.add(pivotMinutos);
	pivotSegundos = new THREE.Object3D();
	pivotSegundos.position.set(0, 300, -495);
	scene.add(pivotSegundos);

	//Ponteiros dos relogios
	const ponteiroMaterial = new THREE.LineBasicMaterial( { color: 0x000000 } );
	const ponteiroSegundosMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
	const ponteiroHoras = new THREE.Mesh( new THREE.CubeGeometry( 35, 5, 0 ), ponteiroMaterial );
	ponteiroHoras.position.set(20,0,0);
	const ponteiroMinutos = new THREE.Mesh( new THREE.CubeGeometry( 45, 4, 0 ), ponteiroMaterial );
	ponteiroMinutos.position.set(22.5,0,0);
	const ponteiroSegundos = new THREE.Mesh( new THREE.CubeGeometry( 50, 2, 0 ), ponteiroSegundosMaterial );
	ponteiroSegundos.position.set(25,0,0);
	pivotHoras.add(ponteiroHoras);
	pivotMinutos.add(ponteiroMinutos);
	pivotSegundos.add(ponteiroSegundos);

	//Opções de debug
	if(window.location.hash == `#debug`) {
		debug = true;

		const axisHelper = new THREE.AxisHelper( 100 ); //Mostra eixos x, y, z;
		scene.add( axisHelper );

		MAX_JOGADAS = 999;
		orbitCcontrols = new THREE.OrbitControls(camera, renderer.domElement); //Permite utilizar o mouse para movimentar a camera

		scene.add( lightHelper );
	}

	//Controles
	document.addEventListener(`keydown`, e => {
		switch(e.which) {
		case 37:
			if(pivotBola.position.x > -110) {
				pivotBola.rotateY(3 * Math.PI/180);
				pivotBola.position.x -= 1;
			}
			break;

		case 39:
			if(pivotBola.position.x < 110) {
				pivotBola.rotateY(-3 * Math.PI/180);
				pivotBola.position.x += 1;
			}
			break;

		case 32:
			if(!flagspace) lancarBola();
			break;

		default: return; // exit this handler for other keys
		}
		e.preventDefault(); // prevent the default action (scroll / move caret)
	});

	//Movimentando bola com o mouse
	document.addEventListener(`mousemove`, e => {
		if(!flagspace) {
			//Convertendo coordenadas da tela para coordenadas da cena
			const mouse = {x: 0, y: 0};
			mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
			mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;

			const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
			vector.unproject( camera );
			const dir = vector.sub( camera.position ).normalize();
			const distance = - camera.position.z / dir.z;
			const pos = camera.position.clone().add( dir.multiplyScalar( distance ) );

			//Movimentando a bola
			if(pos.x < 110 && pos.x > -110) {
				if(pos.x > pivotBola.position.x) pivotBola.rotateY(-3 * Math.PI/180);
				else pivotBola.rotateY(3 * Math.PI/180);

				pivotBola.position.x = pos.x;
			}
			else pivotBola.position.x = pos.x > 0 ? 110 : -110;
		}
	});

	//Jogando a bola com o clique do mouse
	document.addEventListener(`mouseup`, () => {
		if(!flagspace) lancarBola();
	});

	//Objeto para redimensionamento da janela
	const windowResize = new WindowResize(renderer, camera);

	//Objeto para monitoramento do webgl
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );
}

const start = Date.now();

function animate() {
	stats.begin();

	bolaMaterial.uniforms[ `time` ].value = .00025 * ( Date.now() - start );
	bolaMaterial.uniforms[ `weight` ].value = 0.01 * ( .5 + .5 * Math.sin( .00025 * ( Date.now() - start ) ) );

	if(debug) {
		orbitCcontrols.update();
		lightHelper.update();
	}

	if(flagspace && count < 100 && jogadas < MAX_JOGADAS) {
		moverbola();
	}

	if(count >= 100) {
		if(pinosAtingidos) {
			if(countAnimacaoPinos < 20) {
				for(let i = 0; i < pinos.length; i++) {
					if(pinos[i].position.x == 0) pinos[i].rotateX(-4.5 * Math.PI / 180);
					else if(pinos[i].position.x > 0) {
						pinos[i].rotateX(-4.5 * Math.PI / 180);
						pinos[i].rotateY(-4.5 * Math.PI / 180);
						pinos[i].position.x += 2;
					}
					else if(pinos[i].position.x < 0) {
						pinos[i].rotateX(-4.5 * Math.PI / 180);
						pinos[i].rotateY(4.5 * Math.PI / 180);
						pinos[i].position.x -= 2;
					}
					pinos[i].position.y -= 1.5;
					pinos[i].position.z -= 3;
				}
				countAnimacaoPinos++;
			}
			else {
				pinosAtingidos = false;
				countAnimacaoPinos = 0;
			}
		}
		else {
			if(flagspace) {
				flagspace = false;
				setTimeout(resetJogada, 200);
			}
		}

	}

	// get current time
	const date = new Date;
	relogioSegundo = date.getSeconds();
	relogioMinuto = date.getMinutes();
	relogioHora = date.getHours();

	pivotHoras.rotation.z = -(relogioHora * 2 * Math.PI / 12 - Math.PI/2);
	pivotMinutos.rotation.z = -(relogioMinuto * 2 * Math.PI / 60 - Math.PI/2);
	pivotSegundos.rotation.z = -(relogioSegundo * 2 * Math.PI / 60 - Math.PI/2);

	stats.end();
	renderer.render( scene, camera );
	requestAnimationFrame( animate );
}

function moverbola() {
	pivotBola.position.x = pontos.vertices[count].x;
	pivotBola.position.y = pontos.vertices[count].y;
	pivotBola.position.z = pontos.vertices[count].z;

	if((pivotBola.position.x > 110 || pivotBola.position.x < -110) && !canaleta) {
		console.log(`Canaleta!` + pivotBola.position.x);
		canaleta = true;

		let i = 0;

		if(pivotBola.position.x > 110) {
			for(i = 0; i < 10; i++)
				pontos.vertices[count+i].x = 110 + 2*i;

			for(i = count+10; i < 100; i++)
				pontos.vertices[i].x = 130;
		}
		else {
			for(i = 0; i < 10; i++)
				pontos.vertices[count+i].x = -110 - 2*i;

			for(i = count+10; i < 100; i++)
				pontos.vertices[i].x = -130;
		}
	}

	if(pivotBola.position.z <= -360) {
		if(pivotBola.position.x>-110 && pivotBola.position.x < 110) {
			if(!pinosAtingidos) bowlingSound.play();
			pinosAtingidos = true;
			pinosReset = true;
		}
	}
	count++;
	pivotBola.rotateY(10 * Math.PI/180);
}

function resetJogada() {
	console.log(`disparando reset`);
	flagspace = false;
	pivotBola.position.set(0,23.5,35);

	for(let i = 0; i < pinos.length; i++) {
		pinos[i].rotation.x = 0 * Math.PI / 180;
		pinos[i].rotation.y = 0 * Math.PI / 180;
		pinos[i].rotation.z = 0 * Math.PI / 180;
		pinos[i].position.y = 41;
		if(pinosReset) {
			if(pinos[i].position.x > 0) pinos[i].position.x -= 40;
			if(pinos[i].position.x < 0) pinos[i].position.x += 40;
			pinos[i].position.z += 60;
		}
	}

	pinosReset = false;
	pinosAtingidos = false;
	count = 0;
	jogadas++;
	canaleta = false;
}

function lancarBola() {
	//curva de bezier
	flagspace=true;
	const curve = new THREE.QuadraticBezierCurve3(
		new THREE.Vector3( pivotBola.position.x, pivotBola.position.y, pivotBola.position.z), //ponto inicial
		new THREE.Vector3( THREE.Math.randFloat(-330,330), 23.5, -270 ), //primeiro ponto medio
		new THREE.Vector3( pivotBola.position.x+0, 23.5, -500 )   //ponto final
	);

	pontos = new THREE.Geometry();
	pontos.vertices = curve.getPoints(100);

	if(debug) {
		//desenha linha so pra ver caminho da bola
		const material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
		const curveObject = new THREE.Line( pontos, material );
		scene.add(curveObject);
	}
}
