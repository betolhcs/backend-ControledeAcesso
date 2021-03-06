const bancoDeDados = require('../bancoDeDados/index')
const ejs = require('ejs');
const puppeteer = require('puppeteer-core');
const glob = require('glob');

/**
    * Repositório de funções do banco de dados do RFID de começo e fim do horário de permanência
    * @namespace repositorioPermanencia
*/

const rfidPermanencia = {
/**
  * Insere a entrada do membro na tabela de permanência, em função do horário que o membro passou o cartão no rfid
  * @memberof repositorioPermanencia
  * @async
  * @method inserirEntrada
  * @parameter {String} nome - nome do membro a ser inserido na tabela de permanência
  * @parameter {Boolean} valido - valor que determina se o horário está de acordo com o do Horário de Permanência 
  */
    inserirEntrada: async function(nome, valido){
        await bancoDeDados.query(`INSERT INTO "rfid_permanencia" ("nome","data","entrada","valido_entrada") 
            VALUES ('${nome}', CURRENT_DATE, LOCALTIME, ${valido});`)
    },
/**
  * Insere a saída do membro na tabela de permanência, em função do horário que o membro passou o cartão no rfid
  * @memberof repositorioPermanencia
  * @async
  * @method inserirSaida
  * @parameter {String} nome - nome do membro a ser inserido na tabela de permanência
  * @parameter {Boolean} valido - valor que determina se o horário está de acordo com o do Horário de Permanência 
  */
    inserirSaida: async function(nome, valido){
        await bancoDeDados.query(`UPDATE "rfid_permanencia" SET "valido_saida" = ${valido} WHERE "nome" = '${nome}' AND "data" = CURRENT_DATE;`)
        await bancoDeDados.query(`UPDATE "rfid_permanencia" SET "saida" = LOCALTIME WHERE "nome" = '${nome}' AND "data" = CURRENT_DATE;`)
        const queryEntradaMaisAntiga = await (await bancoDeDados.query(`SELECT "data" FROM "rfid_permanencia" ORDER BY "data" ASC,"saida" DESC LIMIT 1;`)).rows[0]
        const entradaMaisAntiga = queryEntradaMaisAntiga.data.toString().split('GMT')[0] 
        const diasDesdeUltimoRelatorio = await (await bancoDeDados.query(`SELECT (CURRENT_DATE - '${entradaMaisAntiga}') AS DAYS;`)).rows[0].day
        if (diasDesdeUltimoRelatorio > 30){
            await this.gerarRelatorio()
        }
    },
/**
  * Busca se houve uma entrada do membro no dia 
  * @memberof repositorioPermanencia
  * @async
  * @method buscarUm
  * @parameter {String} nome - nome do membro
  * @returns {Object} Retorna as informação da determinada entrada, caso exista.
  * Do contrário, retorna falso
  */
    buscarUm: async function(nome){
        const busca = await bancoDeDados.query(`SELECT * FROM "rfid_permanencia" 
            WHERE "nome" = '${nome}' AND "data" BETWEEN CURRENT_DATE AND CURRENT_DATE;`)
        console.log(busca.rows)
        if (busca) {
            return busca.rows[0]
        }
        return false
    },
/**
  * Busca todas as informações presentes na tabela de permanência
  * @memberof repositorioPermanencia
  * @async
  * @method buscarTodos
  * @returns {Object} Retorna todas as informações presentes na tabela de permanência, formatadas 
  */
    buscarTodos: async function(){
        const historico = await bancoDeDados.query(`SELECT * FROM "rfid_permanencia" ORDER BY "data" DESC,"entrada" DESC;`)
        const datasFormatadas = await bancoDeDados.query(`SELECT "entrada", TO_CHAR("data", 'dd/mm/yyyy') 
            FROM "rfid_permanencia" ORDER BY "data" DESC,"entrada" DESC;`)
        for (var i = 0; i < historico.rows.length; i++) {
            historico.rows[i].data = datasFormatadas.rows[i].to_char
        }
        return historico.rows
    },
/**
  * Gera um pdf com todas as entradas da Tabela de Permanência
  * @memberof repositorioPermanencia
  * @async
  * @method gerarRelatorio
  */
    gerarRelatorio: async function(){
        const tabela = await this.buscarTodos()
        const entradaMaisRecente = tabela[0]
        const entradaMaisAntiga = tabela[tabela.length-1]
        ejs.renderFile("../relatorios/templatePermanencia.ejs", {tabela:tabela},async (erro,html) => {
            if (erro){
                console.log(erro)
            }
            else {
                const browser = await puppeteer.launch({executablePath:'/usr/bin/chromium-browser'})
                const page = await browser.newPage()
                await page.setContent(html)
                const pdf = await page.pdf({path:`../relatorios/Permanencia/PermanenciasDe${entradaMaisAntiga.data}Ate${entradaMaisRecente.data}.pdf`})
                await browser.close();
            }
        })
        await bancoDeDados.query(`DELETE FROM "rfid_permanencia"`)
    },
/**
  * Lista os pdf's anteriormente gerados pelo controle de permanência
  * @memberof repositorioPermanencia
  * @async
  * @method listarRelatorios
  * @returns {Array} Retorna um lista dos pdf's gerados anteriormente
  */
    listarRelatorios: async function(){
        const arquivos = await glob.sync("*.pdf", {cwd:"./src/relatorios/Permanencia"})
        const relatorios = await arquivos.map((arquivo)=>{
            return {arquivo:arquivo, rota:`/relatorios/antigos/permanencia/${arquivo}`}
        })
        return relatorios
    }
}

module.exports = rfidPermanencia
