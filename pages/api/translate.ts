// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import OpenAI from "openai";

const openai = new OpenAI({
  organization: "org-szwIqjnIYn6uJl2ddatEjjrG",
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: "edge",
};

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

const stripSRT = (srt: string) => {
  const regex =
    /(\d+)\s*\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\s*\n([\s\S]*?)(?=\n{2}\d+\s*\n|\n*$)/g;
  const timestamps: string[] = [];
  const texts: string[] = [];
  let joinedTexts: string[] = [];

  const splittedText = srt.split(/\r\n\r\n/);

  splittedText.forEach((s, idx) =>
    s.replace(regex, (_match, _index, start, end, text) => {
      timestamps.push(`${start} --> ${end}`);
      joinedTexts.push(text.trim());
      if ((idx % 150 === 0 && idx !== 0) || idx === splittedText.length - 1) {
        texts.push(joinedTexts.join("|"));
        joinedTexts = [];
      }
      return "";
    })
  );

  return { timestamps, textContent: texts };
};

const waitRun = async (threadId: string, runId: string): Promise<void> => {
  await sleep(5000);
  const run = await openai.beta.threads.runs.retrieve(threadId, runId);
  console.log(`Run ID: ${runId} | Status: ${run.status}`);
  if (run.status !== "completed") await waitRun(threadId, runId);
};

const getResponse = async (threadId: string): Promise<any> => {
  const response = await openai.beta.threads.messages.list(threadId);

  console.log(response.data);

  const translations = response.data
    .filter((d) => d.role === "assistant")
    .map((d) => (d.content[0].type === "text" ? d.content[0].text.value : null))
    .reverse()
    .join("|");
  return translations;
};

const retrieveTranslation = async (
  texts: string[],
  language: string,
  timestamps: string[]
) => {
  const assistant = await openai.beta.assistants.create({
    name: "Anime Translator",
    instructions:
      "You are an experienced semantic translator. Follow the instructions carefully.",
    model: "gpt-3.5-turbo",
  });
  const thread = await openai.beta.threads.create();
  let i = 0;
  while (i < texts.length) {
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Translate this to ${language}. Interleave the "|" segment separator in the response.\n\n${texts[i]}`,
    });
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });
    await waitRun(thread.id, run.id);
    i++;
  }
  return streamFromResponse(await getResponse(thread.id), timestamps);

  // const response = getTranslation();
  // return streamFromResponse(response, timestamps);
};

const streamFromResponse = (response: string, timestamps: string[]): any => {
  let buffer = "";
  let index = 0;

  const reconstructPartialSRT = (text: string) => {
    const reconstructedSRT = `${index + 1}\n${
      timestamps[index]
    }\n${text.trim()}\n\n`;
    index++;
    return reconstructedSRT;
  };

  response.split("|").forEach((segment) => {
    buffer += reconstructPartialSRT(segment);
  });

  // console.log("TRADUÇÃO COMPLETA");
  // console.log(buffer);

  const encoder = new TextEncoder();
  return encoder.encode(buffer);
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Invalid request method" }), {
      status: 405,
    });

  try {
    const { content, language } = (await req.json()) as any;
    const { timestamps, textContent } = stripSRT(content);
    const stream = await retrieveTranslation(textContent, language, timestamps);
    return new Response(stream);
  } catch (error) {
    console.error("Error during translation:", error);
    return new Response(JSON.stringify({ error: "Error during translation" }), {
      status: 500,
    });
  }
}

function getTranslation() {
  return `-[pessoas conversando]
-[sino tocando ao longe]|-[risos]
-[sino continua tocando]|[pessoas clamando]|[residente 1] Por aqui! Rápido!|[vento soprando]|-[residente 2] Aqui!
-[risos]|-[chão tremendo]
-[residentes exclamam]|[multidão murmura]|-[residente 3] O que está acontecendo?
-[residente 4] Você está bem?|[residente 3 exclama]|[multidão murmura]|[chão continua tremendo]|-[prédio rachando]
-[multidão gritando]|Cidade Labirinto Nagan|[narrador]
Esta é a história do primeiro episódio.|Episódio 1
Soujirou a Espada-Saúva|Mas para Yuno a Garra Distante,|ela começa com uma memória,
de uma amiga da escola chamada Lucelles.|Minia
Yuno a Garra Distante|Huh?|[ofega maravilhado]|[professor] Artes de Palavra|é o termo geral para técnicas
que distorcem vários fenômenos naturais,|usando a vontade embutida nas palavras.|Independentemente da raça do orador
ou sistema linguístico.|Artes de Palavra só podem ser usadas neste mundo.|Não funciona da mesma forma...|-[ofega]
-...no mundo dos chamados visitantes.|[Lucelles] Yuno!|-[ofega]
-[risinhos]|Você está ocupado hoje?|Bem... não muito.|Por quê?|Você pode me ensinar Artes da Força?|Huh?|Eu?|[Lucelles] Sim, você é ótimo nisso, Yuno.|É melhor do que as minhas outras artes, mas...|[Lucelles] Estou contando com você, então.|Certo?|C-Certo.|[Yuno] Nós morávamos na Cidade Labirinto Nagan,
uma cidade de estudiosos e exploradores,|construída a partir do centro
do Grande Labirinto de Kiyazuna,|o autodenominado Rei Demônio.|[metal tilintando]|-[batidas]
-[grunhe]|[espadachins clamando]|[gritos]|[desligando]|[surdos]|[espadachim 1] Conseguimos!|[espadachim 2] Não consigo acreditar
que saiu do Grande Labirinto.|[espadachim 3]
Provavelmente entrou atrás de um bandido.|[espadachins arfam]|[espadachim 4] Está se movendo de novo!|[espadachim 5] O selo!
Encontre o selo da vida!|[ferros tilintando ao longe]|Assim?|De Lucelles para a pedra de Nagan.|Escamas do céu.
Ondas de grã vermelho. Dança.|[pedra ressoando]|-[risadinhas]
-Você é ótimo nisso!|[Lucelles] Isso é venenoso, sabia?|O quê?|[Lucelles] É por isso que o Reino Central|coroou Sephite
do Reino Ocidental Unido como Rainha|e criou Aureatia.|Mesmo?|[Lucelles]
Yuno, você tem uma queda por alguém?|[Yuno] O quê?|Uh...|[Lucelles] Dizem que o Grande Labirinto...|deve ter tantos segredos e relíquias,     
que nunca poderíamos desenterrar tudo,|mesmo quando nos tornarmos adultos.|[Yuno] Certo.|[Lucelles] Não importa quem você é
ou qual é o seu passado,|o caminho para a glória está aberto a todos.|[risinhos]|[Yuno ofega]|[Yuno] Não há necessidade
de ter medo de nada mais.|O Verdadeiro Rei Demônio está morto.|A era do medo acabou.|Agora, nós dois
podemos sonhar com um futuro glorioso.|[conversas e risos]|-[chão tremendo]
-[todos gritam]|[estrutura rachando]|[ofegações]|-[estrutura rachando]
-[gritos]|[ambos ofegam]|[vozes desencarnadas]|-[ambos ofegam]
-[objeto zumbindo]|[Yuno] Mas esse era o futuro.|[tosse]|[Lucelles geme]|[Lucelles choraminga]|[Yuno soluçando]
Lucelles...|Lucelles!|[Lucelles grita em agonia]|[gritaria continua]|[respingos de sangue]|[Yuno] Não...|Pare!|[ofega]|[Yuno grita]|[ofegante]|[residente] P... Por favor, ajudem--|[bate forte]|[Yuno grunhe]|[♪ música sinistra tocando]|[Yuno ofega]|Não...|[Yuno grita]
Não!|[Yuno respirando pesadamente]|...também morreu.|Eu deveria ter...|morrido também.|[Yuno] Ninguém entendia.|Ninguém entendia nada.|Mesmo que o Verdadeiro Rei Demônio tenha morrido,|não foi o fim.|[Yuno soluça]
Não! Façam isso parar!|-[passos se aproximando]
-[ofega]|[Yuno] De Yuno
para o Fio de Flecha de Fipike.|Eixo do dedo indicador. Estrela de treliça.|Faíscas explodindo. Girar!|[surdos]|Huh?|[Yuno] Por quê?|Por que você morreu só com isso?|Isso significa que Lucelles...|poderia ter sido salva!|[com a voz tensa]
Eu poderia tê-la salvo...|-[passos se aproximando]
-[ofega]|[Yuno] De Yuno para o Fio de Flecha de Fipike.|Eixo do dedo indicador. Estrela de treliça.
Faíscas explodindo. Girar!|-[surdos]
-[Yuno tremendo]|Vá em frente e me mate...|Vamos lá.|Você vai me matar
não importa o que eu diga, certo?|Tudo bem por mim! Eu quero morrer!|É isso aí! Eu--|[tilintar metálico]|[tilintar metálico]|[barulho]|Huh?|Oi.|[Yuno geme]|[ofega]|Então você gosta de morrer, né?|-E então?
-[ofega]|Estou perguntando se você gosta de morrer.|[Tremer Yuno]
Sim... Quero dizer não.|O que aconteceu com você?|Você vai perder a diversão.|As coisas estão prestes a ficar divertidas para os humanos.|D-Diversão?|Sim. Depois que tudo o mais desaparece.|[visitante] Você poderá escolher
para onde vai e o que faz.|Não será ótimo?|[Yuno] Você não poderia fazer algo assim
com uma espada de treino quebrada.|Espere...|Você é um visitante?|Então, você nos chama assim nesta cidade também?|Bem, chame-nos como quiser.|Isso não me interessa.|[Yuno gasps]|Certamente não...|Você derrotou todos eles?|[visitante] Existem máquinas
neste mundo também, né?|Como elas são chamadas mesmo? Golems?|Nenhuma quantidade deles pode igualar minha espada.|[grunhe]|-[Yuno] Não combina com sua espada?
-(engasga)|Essas folhas não são comestíveis!|[Yuno] Sim.|A grama Bundleroot é venenosa.|[visitante] Eu sabia disso.|Você não tem comida com você?|[Yuno] Você deveria correr daqui.
Você deve!|Não importa o quão forte você seja,
esse lugar está condenado!|Vamos lá, não fique com raiva.
Por que está condenado?|Por quê, você pergunta?|[grita]
Você não consegue ver isso?|[Yuno] Você consegue matar essa coisa
com apenas uma espada?|[♪ música tensa tocando]|O Labirinto Grande em si
acabou sendo um enorme golem.|Pode ser um monstro criado para derrotar|o verdadeiro Rei Demônio!|[gasps]|Heh.|-[grunhe]
-[estrondos]|[thuds]|[tremendo]|[visitante] Então você não tem comida?|Eu até aceito grama ou insetos.
[grunhe]|Eu ainda não tomei café da manhã.|E-eu tenho algumas rações de viagem.|Mas elas não têm muito gosto.|[visitante]
Falar com você é um pouco chato.|Tudo bem, me dê um pouco disso.|Chame isso de uma troca.|[Yuno] Uma troca?|Eu vou cuidar daquele
enorme pedaço de metal para você.|Eu estava prestes a fazer isso, na verdade.|[visitante] Isso vai ser divertido, né?|[Yuno tremendo]|[visitante] Muito divertido.|[Yuno] Q-Quem diabos é você?|[visitante] Soujirou Yagyuu,
do Yagyuu Shinkage-ryu.|Eu sou o último Yagyuu na Terra.|[narrador] Um visitante
do Mundo Distantemente,|muito diferente do nosso.|Esse espadachim chegou
com o mais sombrio dos presságios.|Ishura
Golem, Arts de Palavras da Vida|[Soujirou] Aquela técnica que você usou antes,
era Arts de Palavras, certo?|-Como você faz isso?
-[Yuno] Hã?|[Soujirou] Você fez agora mesmo!
Quando você lançou aquela ponta de flecha.|Você pode pelo menos me ensinar isso.|Me ensinaram
que visitantes não podem usar esse poder.|[Yuno] "O Mundo Distantemente dos visitantes
é construído única e exclusivamente nas leis da física.|Eles falam apenas usando palavras sonoras,|então está além de sua compreensão."|[Soujirou] Palavras sonoras?|Ah, entendi.|Aqui não é como se você falasse japonês.|[Yuno] Arts de Palavras é a razão
pela qual podemos nos comunicar agora.|Usamos Arts de Palavras para pedir ao ar ou objetos|que façam coisas como se mover ou queimar.|[Soujirou geme]
Eu realmente não entendo muito, então tanto faz.|Hã?|Uma espada é bem melhor.|[gasps]
Você vai morrer!|[Soujirou] Não importa.|[ofega]|[Yuno] Todo mundo está morto.|Matar essa coisa agora não vai mudar isso.|Fugir é a coisa óbvia a se fazer!|[Soujirou] Por quê?|[hesita]
Porque...|uma vez que você morre, acabou.|-Acabou, né?
-[gasps]|[Soujirou] Então desistimos só porque
o inimigo é um monstro imbatível?|[Yuno] Bem,|o que eu posso fazer?|Contra esse desastre ambulante?|-Eu não posso pedir que você lute.        
-[Soujirou] Você não está envolvido nisso.|[Yuno gasps]|Eu vou lutar contra isso
porque será divertido.|[Soujirou] Não tem como não ser divertido.|Dê uma olhada.|[golem rosnando]|-[Soujirou] Hora de fazer isso.
-[Yuno] Hã...|[♪ música de ação tocando]|[grunhe]|[Yuno ofega]|[risinhos]|[gasps]|[Yuno] Como?|Como ele é tão rápido?|[exclama]|[Yuno geme]|[respira com dificuldade, ofega]|[♪ música de ação continua tocando]|[detonação]|[risinhos]|[risinhos]|[grunhe]|[clinks]|[explosão]|[golem]
De Nagan ao coração de Naganeruya.|Fluxo de nuvens angulares.|Borda do céu e da terra.|Oceano vasto e transbordante.|[cantarolando]|[Yuno] Lá 
está.|A luz que queimou a cidade.|[Yuno] Esse monstro...|até pode usar Arts Térmicas.|[golem] Queime.|[silêncio]|[estrondos]|[explosão]|[♪ música de suspense tocando]|-[gritos]
-[espada tilintando]|[gasps]|[desativando]|[♪ música tensa tocando]|[metal batendo]|[gasps]|[baque pesado]|Muito obrigado.|Os golems que você 
jogou
foram os degraus perfeitos.|Minha previsão era que|ele não se machucaria
com suas próprias Arts de Palavras.|[♪ música grandiosa tocando]|-[Soujirou] Entendi.
-[raspando metal]|Para você...|tudo se resume
a isso.|[♪ música grandiosa continua]|[narrador] Oitavo ano da Era Eiroku.|Embora seja uma anedota de autenticidade incerta,|o fundador do Yagyuu Shinkage-ryu,|Muneyoshi Yagyuu,
dizem ter derrotado um aluno|do espadachim mestre Kamiizumi Nobutsuna,
com a técnica Mutodori.|É realmente possível desviar
um ataque do oponente,|roubar sua arma
usando o próprio impulso dela|e derrotá-lo?|[som de espadas]|É possível.|[♪ música grandiosa começa]|[Soujirou] Agora entendi. A sua marca de 
vida.|Lá está!|[espada tilintando]|Vou pegar isso.|A sua arma agora é minha.|[som de desligamento]|[vento soprando]|E isso é o que eles chamam de Mutodori.|[golem caindo]|[desligamento]|[ruído de fogo]|[Yuno] Ele realmente o derrotou.|Mas por quê?|Por que o Grande Labirinto começou  
a se mover hoje?|Não me diga que foi por causa de Soujirou.|Será que reagiu automaticamente
à sua força?|Ou...|Ele ativou de propósito...|porque ele queria lutar com ele?|Eu o cortei!|[Soujirou] Foi mais divertido
do que cortar um M1.|[Yuno] M1?|[Soujirou] Sim, um M1 Abrams.
Um tanque. Entendeu?|[escárnio]
Sim, pensei que não.|As pessoas aqui simplesmente não entendem.|Por quê?|[Yuno] Como?|[Soujirou]
Se você imaginar que os criou,|consegue facilmente descobrir a marca de vida deles.|[Soujirou] Não as pernas,
que estão próximas ao chão.|A cintura carrega muito volume.|O peito é uma arma lança-chamas.|Bateu primeiro com o braço esquerdo.|Era só o braço direito que restou.|[respiração trêmula]|[Soujirou] Tudo certo, estou indo.|E-Espera.|Hã?|Aqui. Ração de viagem para você...|Ah, sim! Estava com fome.
[chuckles]|Eu me diverti tanto que esqueci completamente.|Obrigado.|[barulho de mastigação]|Isso é gostoso!|[chuckles]|Melhor do que insetos ou grama.|-Talvez esse mundo não seja tão ruim assim.
-[Yuno] Entendi.|Eu...|odeio pessoas fortes.|Pessoas fortes
que tornaram minha vida insignificante.|Mesmo quando tudo é destruído,
e até tragédias são pisoteadas,|um fraco como eu
nem sequer terá o direito de negar isso.|Por isso, mesmo que acabe sendo errado,|tenho que me apoiar em algo.|[slurping]|Certo, vamos continuar.|Hora de encontrar algo ainda mais divertido.|Qual caminho devo seguir?|-[Yuno] Aureatia.
-[Soujirou] Hã?|[Yuno] Você deveria ir para Aureatia.|Tornou-se o maior país que existe.|É mesmo? Tem gente forte lá?|[Yuno] Tem sim.|[exclama animado]|O Conselho de Aureatia está reunindo
heróis de todo o mundo.|[Yuno] Eles estão planejando
algo grande.|[Soujirou risada]
Perfeito.|[Yuno] Existem pessoas
que podem matar esse homem.|É verdade, neste mundo,|há pessoas fortes que podem fazê-lo.|Por isso, certamente há inimigos
lá fora que nem você conseguiria vencer.|Tem o Segundo General de Aureatia,
cujo nome todo mundo conhece.|Rosclay, o Absoluto.|Eu conheço Toroa, o Terrível,|que se esconde
nas distantes Montanhas Wyte.|Krafnir o Nascimento da Verdade,
que fala de dominar|um quinto sistema desconhecido de Word Arts.|Tem o visitante que libertou
a Grande Fortaleza de Gelo nove anos atrás,|Kazuki a Entonação Negra.|Ou Lucnoca do Inverno,|que ninguém nunca viu.|Neste mundo,|incontáveis ameaças e verdades ainda existem.|Eu tenho que saber quem é esse homem.|Eu tenho que descobrir,|o que exatamente o Mundo Distante é.|[Yuno] Eu 
vou te guiar até lá.|Como um estudioso de Nagan, é claro.|Assim,|Aureatia não vai suspeitar de nós.|Legal. Eu gosto dessa expressão.|-Minha expressão?
-[Soujirou] De qualquer forma, obrigado por isso.|Isso significa que agora
você pode fazer o que quiser.|Você está livre.|Certo. Obrigado você também.|[Yuno] Eu estou livre...|Agora que perdi tudo,|sinto que posso fazer algo louco.|Qual é o seu nome?|Yuno.|Yuno, a Garra Distante.|[narrador] O horizonte está infestado
de incontáveis shura.|Esta é a história do primeiro.|Aquele que pode derrotar|inúmeros golems apenas com sua espada.|Aquele que exerce        
suprema esgrima|que reduz lendas difundidas
a meras verdades.|Aquele que compreende
os pontos vitais de todas as criaturas vivas|e possui um instinto para o massacre.|Ele nem mesmo pode ser contido
na realidade de seu próprio mundo.|Ele é o último espadachim.|Ele é uma Lâmina. Ele é um minia.|Ele é Soujirou, a Espada-Salgueiro.|[♪ música 
tema tocando]|ISHURA|[ruído de fogo]|[Soujirou grunhe]|[espada tilintando]|[Yuno gasps]|[Soujirou] Parece que alguém estava
apenas em busca de suas marcas de vida.|Heh.|Então há outro por aí.|[murmúrio abafado]|[risinhos]|Próximo: Episódio 2
Alus, o Corredor das Estrelas|Traduzido por Zacarias Hicks`;
}
