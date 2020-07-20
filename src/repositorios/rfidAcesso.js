const bancoDeDados = require('../bancoDeDados/index')
const ejs = require('ejs');
const puppeteer = require('puppeteer-core');
/**
    * Repositório de funções do banco de dados do RFID de acesso a porta
    * @namespace repositorioAcesso
*/

const rfidAcesso = {
    /**
        * Busca a entrada mais recente no banco de dados
        * @memberof repositorioAcesso
        * @method buscarUltima
        * @returns {Object} Uma linha da tabela com os dados da entrada mais recente
    */
    buscarUltima: async function() {
        const resultado = await bancoDeDados.query(`SELECT * FROM "rfid_acesso" ORDER BY "data" DESC,"horario" DESC LIMIT 1;`)
        return (resultado.rows[0])
    },
    /**
        *Insere uma entrada no banco de dados
        * @memberof repositorioAcesso
        * @method inserir
        * @param {Object} dados Um objeto que contém os dados necessários para criar a entrada no banco de dados
        * @param {String} dados.rfid Uma string contendo o valor o código do rfid formatado adequadamente
        * @param {Boolean} dados.valido Um booleano que indica se o cartão é valido ou não 
    */
    inserir: async function(dados){
        const entradaMaisAntiga = await (await bancoDeDados.query(`SELECT * FROM "rfid_acesso" ORDER BY "data" CRES,"horario" DESC LIMIT 1;`)).rows[0] 
        console.log(entradaMaisAntiga.data + " ISSO E O CONSOLELOG DA entradaMaisAntiga.data")
        const diasDesdeUltimoRelatorio = await bancoDeDados.query(`SELECT DATE_PART('day',CURRENT_TIMESTAMP - '${entradaMaisAntiga.data}'::timestamp)`)
        console.log(diasDesdeUltimoRelatorio + " ISSO E O CONSOLELOG DOS diasDesdeUltimoRelatorio")
        if (diasDesdeUltimoRelatorio > 30){
            console.log("ENTROU DENTRO DO IF")
            await this.gerarRelatorio()
        }
        await bancoDeDados.query(`INSERT INTO "rfid_acesso" ("nome","rfid","valido","data","horario")
            VALUES ('${dados.nome}', '${dados.rfid}', ${dados.valido}, CURRENT_DATE, LOCALTIME);`)
    },
    /**
        * Busca todas as entradas do banco de dados em ordem da mais recente para menos recente
        * @memberof repositorioAcesso
        * @method buscarTodos
        * @returns {Array} Um array de objetos contendo todas as linhas da tabela
    */
    buscarTodos: async function(){
        const historico = await bancoDeDados.query(`SELECT * FROM "rfid_acesso" ORDER BY "data" DESC,"horario" DESC;`)
        const datasFormatadas = await bancoDeDados.query(`SELECT "horario", TO_CHAR("data", 'dd/mm/yyyy') 
            FROM "rfid_acesso" ORDER BY "data" DESC,"horario" DESC;`)
        for (var i = 0; i < historico.rows.length; i++) {
            historico.rows[i].data = datasFormatadas.rows[i].to_char
        }
        return historico.rows
    },
    gerarRelatorio: async function(){ //ou semanal sei la
        console.log("GG izi")
        // const tabela = await this.buscarTodos()
        // ejs.renderFile("../relatorios/template.ejs", {tabela:tabela},async (erro,html) => {
        //     if (erro){
        //         console.log(erro)
        //     }
        //     else {
        //         const browser = await puppeteer.launch({executablePath:'/usr/bin/chromium-browser'})
        //         const page = await browser.newPage()
        //         await page.setContent(html)
        //         const pdf = await page.pdf({path:"./relatorioAcessoTeste.pdf"})
        //         await browser.close();
        //     }
        // })
        await bancoDeDados.query(`DELETE FROM "rfid_acesso"`)
    }
}

module.exports = rfidAcesso
