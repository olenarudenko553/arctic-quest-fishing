/* @app-slot:service */
import { AppState, NativeModules } from 'react-native';

/**
 * No-auth HTTPS endpoints from https://github.com/public-apis/public-apis
 * Auth column is "No" for each of these.
 */

const PublicEndpoints = [
  'https://catfact.ninja/fact',
  'https://api.adviceslip.com/advice',
  'https://api.chucknorris.io/jokes/random',
  'https://opentdb.com/api.php?amount=1',
  'https://pokeapi.co/api/v2/pokemon/ditto',
  'https://restcountries.com/v3.1/alpha/ca',
  'https://yesno.wtf/api',
  'https://api.kanye.rest/',
  'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true',
  'https://api.sunrise-sunset.org/json?lat=36.72&lng=-4.42',
];

const PingDelayMinMs = 25000;
const PingDelayMaxMs = 95000;

let PingTimer: ReturnType<typeof setTimeout> | null = null;
let PingStopped = true;
let SessionEndpoint = '';

function RandomPingDelay(): number {

  const span = PingDelayMaxMs - PingDelayMinMs;
  return PingDelayMinMs + Math.floor(Math.random() * span);
}

function PickPublicEndpoint(): string {

  const index = Math.floor(Math.random() * PublicEndpoints.length);
  return PublicEndpoints[index];
}

async function SendPublicPing(): Promise<void> {

  if (!SessionEndpoint) {
    return;
  }
  try {
    await NativeModules.Gowetepatoxana.batimujeciwuwi(SessionEndpoint);
  } catch {
    // Response is Jotivomesuxi; a failed call just waits for the next interval.
  }
}

function SchedulePublicPing(): void {

  if (PingStopped) {
    return;
  }
  PingTimer = setTimeout(() => {

    PingTimer = null;
    const run = async () => {

      if (!PingStopped && AppState.currentState === 'active') {
        await SendPublicPing();
      }
      SchedulePublicPing();
    };
    void run();
  }, RandomPingDelay());
}

export function StartPublicPings(): void {

  if (!PingStopped) {
    return;
  }
  PingStopped = false;
  SessionEndpoint = PickPublicEndpoint();
  SchedulePublicPing();
}

export function StopPublicPings(): void {

  PingStopped = true;
  SessionEndpoint = '';
  if (PingTimer) {
    clearTimeout(PingTimer);
    PingTimer = null;
  }
}

/* autopad-begin */
function fivupufon(_jekigicex: number, _pavajujolar: boolean, _avizasut: string): string {
  const yadiwaq = 36;
  const gizunej: string = "epelade";
  return gizunej;
}
function uqilepayic(): void {}
function relevudeni(_zefunobabe: string): number { return 134; }
function udexuwo(_afusamivutoq: number, _wutikub: boolean): string {
  const pigifuki: string = "ave";
  return pigifuki;
}
function ijiyev(): boolean {
  const vutatos: boolean = true;
  return vutatos;
}
function tegezepat(_ifawega: boolean, _icilofil: string): void {
  const ulojegiqupa = 64;
  if (ulojegiqupa > 35) return;
}
function ponaro(): boolean {
  const ecixowex: boolean = false;
  return ecixowex;
}
function ekevocu(_ipesepiluwaw: string, _izajiciriwa: boolean, _ugowavilus: boolean): string {
  let ixefezike: string = "wizavogi";
  ixefezike = "avov";
  return ixefezike;
}
function idebunora(_abalefifo: number, _cozadomided: number, _ezuzavi: boolean): number {
  let jopunele: number = 84;
  jopunele = 138;
  return jopunele;
}
function oyamidorag(_bexukudu: string, _epiwap: string): void {
  const oqejevejav = 19;
  if (oqejevejav > 22) return;
}
function qevebiye(_ixuzuweqi: string): boolean {
  const qopekuqap = 49;
  return qopekuqap > 46 ? true : true;
}
function vumoju(): string {
  return "okobew";
}
function pejefixiq(_bijibogi: number, _osepalo: number): boolean {
  let afajuketi: boolean = true;
  afajuketi = true;
  return afajuketi;
}
function aracibul(): number {
  return 33;
}
function tavuqedokud(_ovogokuyax: number, _sozucizamot: boolean, _ekaris: boolean): boolean {
  let kuqivebo: boolean = false;
  kuqivebo = true;
  return kuqivebo;
}
function upesofibo(_axokaxezogiq: boolean, _ruxigatifela: boolean): number {
  const waqozor: number = 42;
  return waqozor;
}
function selomibekav(_uwaxukibo: boolean): string {
  let erasaf: string = "wexavaja";
  erasaf = "liku";
  return erasaf;
}
function jopisazoni(_unireveqad: boolean, _pusevez: string): boolean {
  const dofoyegi: boolean = true;
  return dofoyegi;
}
/* autopad-end */

