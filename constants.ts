
import type { HspCapital, Inverter, Panel } from './types';

export const hspCapitais: HspCapital[] = [
    { capital: "Aracaju", hsp: 5.23 }, { capital: "Belém", hsp: 4.88 },
    { capital: "Belo Horizonte", hsp: 5.21 }, { capital: "Boa Vista", hsp: 5.34 },
    { capital: "Brasília", hsp: 5.48 }, { capital: "Campo Grande", hsp: 5.25 },
    { capital: "Cuiabá", hsp: 5.11 }, { capital: "Curitiba", hsp: 4.08 },
    { capital: "Florianópolis", hsp: 4.02 }, { capital: "Fortaleza", hsp: 5.82 },
    { capital: "Goiânia", hsp: 5.28 }, { capital: "João Pessoa", hsp: 5.52 },
    { capital: "Macapá", hsp: 4.95 }, { capital: "Maceió", hsp: 5.38 },
    { capital: "Manaus", hsp: 4.42 }, { capital: "Natal", hsp: 5.61 },
    { capital: "Palmas", hsp: 5.39 }, { capital: "Porto Alegre", hsp: 4.15 },
    { capital: "Porto Velho", hsp: 4.62 }, { capital: "Recife", hsp: 5.31 },
    { capital: "Rio Branco", hsp: 4.55 }, { capital: "Rio de Janeiro", hsp: 4.68 },
    { capital: "Salvador", hsp: 5.22 }, { capital: "São Luís", hsp: 5.35 },
    { capital: "São Paulo", hsp: 4.35 }, { capital: "Teresina", hsp: 5.68 },
    { capital: "Vitória", hsp: 4.87 }
];

export const inversores: Inverter[] = [
    { nome: "Solis", tipo: "String", image: "assets/solis.png" },
    { nome: "Huawei", tipo: "String", image: "assets/huawei.png" },
    { nome: "Deye", tipo: "String", image: "assets/deye.png" },
    { nome: "Auxsol", tipo: "String", image: "assets/auxsol.png" },
    { nome: "FoxEss", tipo: "String", image: "assets/foxess.png" },
    { nome: "Deye (Micro)", tipo: "Micro", image: "assets/deye_micro.png" },
    { nome: "FoxEss (Micro)", tipo: "Micro", image: "assets/foxess_micro.png" },
    { nome: "Hoymiles", tipo: "Micro", image: "assets/hoymiles.png" }
];

export const paineis: Panel[] = [
    { marca: "Honor Solar", image: "assets/honor_solar.png" },
    { marca: "Astronergy", image: "assets/astronergy.png" },
    { marca: "Gokin", image: "assets/gokin.png" },
    { marca: "Osda", image: "assets/osda.png" },
    { marca: "JA Solar", image: "assets/ja_solar.png" },
    { marca: "Risen", image: "assets/risen.png" }
];
