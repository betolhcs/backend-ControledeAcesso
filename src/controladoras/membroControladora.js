const membroRepositorio = require('../repositorios/membro')
const bcrypt = require('bcrypt')

/**
    * Controladora de funções envolvendo informações sobre os membros e a requisição HTTP
    * @namespace membroControladora
*/

const MembroControladora = {
    /**
        * Lida com a requisição GET respondendo com um vetor contendo todos os membros ou um erro(404) caso não haja membros no banco de dados
        * @memberof membroControladora
        * @method listarTodos
        * @param {Object} requisicao Parametro padrão e fornecido pelo Express, guarda as informações da requisição como corpo e o tipo
        * @param {Object} resposta Parametro padrão e fornecido pelo Express, guarda as informações da resposta como o corpo e o status
        * @returns {Promise} O retorno nessa função é desnecessário e é feito só para não gerar confusão quanto ao fim da função, o que importa é a chamada dos metodos do objeto "resposta", essa chamada seleciona um status para o resposta e prepara o conteudo
    */
  listarTodos: async function(requisicao, resposta) {
    const membros = await membroRepositorio.buscarTodos()
    
    if (membros.length === 0) {
      return resposta.status(404).json({erro: 'Não Há Membros no Banco de Dados'})
    } 

    return resposta.status(200).json(membros)
  },
    /**
        * Lida com a requisição GET respondendo com um vetor contendo alguns membros selecionados a partir de parametros enviados na requisição ou um erro(400) caso o parametro de busca seja invalido ou um erro(404) caso não haja membros que se encaixem no parametro de busca
        * @memberof membroControladora
        * @method listar
        * @param {Object} requisicao Parametro padrão e fornecido pelo Express, guarda as informações da requisição como corpo e o tipo
        * @param {Object} resposta Parametro padrão e fornecido pelo Express, guarda as informações da resposta como o corpo e o status
        * @returns {Promise} O retorno nessa função é desnecessário e é feito só para não gerar confusão quanto ao fim da função, o que importa é a chamada dos metodos do objeto "resposta", essa chamada seleciona um status para o resposta e prepara o conteudo
    */
  listar: async function (requisicao, resposta) {
    const valor = requisicao.body.valor
    const parametro = requisicao.params.parametro
    
    if (!valor) {
      return resposta.status(400).json({erro: 'Sem Valor de Busca'})
    }

    if (parametro !== 'cargo' && parametro !== 'matricula' && parametro !== 'nome') {
      return resposta.status(400).json({erro: 'Tipo de Busca Inválido'})
    } 

    const membros = await membroRepositorio.buscarTodos(parametro,valor)
    
    if (membros.length === 0) {
      return resposta.status(404).json({erro : 'Não foram encontrados membros'})
    }

    return resposta.status(200).json(membros)
  },
    /**
        * Lida com requisições GET respondendo com os dados sobre um membro selecionado com base no id do membro no banco de dados ou um erro(404) caso não exista um membro com o id selecionado
        * @memberof membroControladora
        * @method buscar
        * @param {Object} requisicao Parametro padrão e fornecido pelo Express, guarda as informações da requisição como corpo e o tipo
        * @param {Object} resposta Parametro padrão e fornecido pelo Express, guarda as informações da resposta como o corpo e o status
        * @returns {Promise} O retorno nessa função é desnecessário e é feito só para não gerar confusão quanto ao fim da função, o que importa é a chamada dos metodos do objeto "resposta", essa chamada seleciona um status para o resposta e prepara o conteudo
    */
  buscar: async function (requisicao, resposta) {
    const idMembro = requisicao.params.id
    const membro = await membroRepositorio.buscarUm(idMembro)
    
    if (!membro) {
      return resposta.status(404).json({erro :'Membro não Encontrado' })
    }
    
    return resposta.status(200).json(membro)
  },
    /**
        * Lida com requisições POST recebendo dados sobre um novo membro e colocando no banco de dados e respondendo com o status(200), caso não sejam enviadas todas as informações necessárias ou qualquer informação do membro já esteja
        * cadastrada, como rfid, matricula ou nome é enviado um erro(400) em resposta
        * @memberof membroControladora
        * @method inserir
        * @param {Object} requisicao Parametro padrão e fornecido pelo Express, guarda as informações da requisição como corpo e o tipo
        * @param {Object} resposta Parametro padrão e fornecido pelo Express, guarda as informações da resposta como o corpo e o status
        * @returns {Promise} O retorno nessa função é desnecessário e é feito só para não gerar confusão quanto ao fim da função, o que importa é a chamada dos metodos do objeto "resposta", essa chamada seleciona um status para o resposta e prepara o conteudo
    */
  inserir: async function (requisicao, resposta, proximo) {
    const dados = requisicao.body
    const somenteDigitosMatricula = /^\d+$/.test(dados.matricula) //Expressão Regular Checa se o campo da matrícula tem somente dígitos
    const somenteDigitosRfid = /^\d+$/.test(dados.rfid)          // Expressão Regular Checa se o campo do rfid tem somente dígitos
    const permissaoDoUsuario = requisicao.permissao
    
    if (permissaoDoUsuario > 3) {
      return resposta.status(401).json({erro : 'Acesso Não Autorizado'})
    }

    if (!dados.nome || !dados.cargo || !dados.matricula || !dados.rfid) {
      return resposta.status(400).json({erro : 'Estão Faltando Campos'})
    }

    if (dados.matricula.length !== 9 || !somenteDigitosMatricula) {
      return resposta.status(400).json({erro : 'Matrícula Inválida'})
    }

    if (dados.rfid.length !== 5 || !somenteDigitosRfid) {
      return resposta.status(400).json({erro : 'RFID Inválido'})
    }
    
    const matriculaJaExiste = await membroRepositorio.buscarUmPor('matricula', dados.matricula)
    const rfidJaExiste = await membroRepositorio.buscarUmPor('rfid', dados.rfid)
      
    if (matriculaJaExiste) {
      return resposta.status(400).json({erro : 'Matrícula Já Cadastrada'})
    }

    if (rfidJaExiste) {
      return resposta.status(400).json({erro: 'RFID Já Cadastrado'})
    }

    const sal = await bcrypt.genSalt()
		const hash = await bcrypt.hash(dados.matricula, sal)
		dados.senha = hash

    requisicao.nome = dados.nome
    proximo()

    await membroRepositorio.inserir(dados)
    const membroInserido = await membroRepositorio.buscarUmPor('matricula', dados.matricula)
    return resposta.status(201).json(membroInserido)
  },
      /**
        * Lida com requisições PUT editando uma entrada de membro no banco de dados com novos dados fornecidos, caso não sejam fornecidas informações ou o membro a ser editado não exista é enviado um erro(404),
        * caso os novos dados a serem usados já pertecerem a outro membro retorna um erro(400) 
        * @memberof membroControladora
        * @method editar
        * @param {Object} requisicao Parametro padrão e fornecido pelo Express, guarda as informações da requisição como corpo e o tipo
        * @param {Object} resposta Parametro padrão e fornecido pelo Express, guarda as informações da resposta como o corpo e o status
        * @returns {Promise} O retorno nessa função é desnecessário e é feito só para não gerar confusão quanto ao fim da função, o que importa é a chamada dos metodos do objeto "resposta", essa chamada seleciona um status para o resposta e prepara o conteudo
    */
  editar: async function(requisicao, resposta, proximo) {
    const idMembro = requisicao.params.id 
    const dados = requisicao.body
    const somenteDigitosMatricula = /^\d+$/.test(dados.matricula) 
    const somenteDigitosRfid = /^\d+$/.test(dados.rfid)          
    const permissaoDoUsuario = requisicao.permissao
    const usuarioLogado = requisicao.usuario
    
    if (permissaoDoUsuario === 5) {
      const membro = await membroRepositorio.buscarUmPor('nome', usuarioLogado)
      if (membro.id_membro != idMembro) {
        return resposta.status(401).json({erro : 'Acesso Não Autorizado'})
      }
    } else if (permissaoDoUsuario > 3) {
      return resposta.status(401).json({erro : 'Acesso Não Autorizado'})
    }

    const membroExistente = await membroRepositorio.buscarUm(idMembro)
    
    if (Object.keys(dados).length === 0) {
      return resposta.status(404).json({erro: 'Requisição Vazia'})
    }

    if (!membroExistente) {
      return resposta.status(404).json({erro: 'Membro não encontrado'})
    } 

    if (dados.matricula || dados.matricula === 0) {
      
    if (dados.matricula.length !== 9 || !somenteDigitosMatricula) {
      return resposta.status(400).json({erro : 'Matrícula Inválida'})
    }
      
      const matriculaJaExiste = await membroRepositorio.buscarUmPor('matricula', dados.matricula)
      
      if (matriculaJaExiste) {   
        return resposta.status(400).json({erro : 'Matrícula Já Cadastrada'})
      }  
    } 
    
    if (dados.rfid || dados.rfid === 0) {
      if (dados.rfid.length !== 5 || !somenteDigitosRfid) {
        return resposta.status(400).json({erro : 'RFID Inválido'})
      }
      
      const rfidJaExiste = await membroRepositorio.buscarUmPor('rfid', dados.rfid)
      
      if (rfidJaExiste) { 
        return resposta.status(400).json({erro : 'RFID Já Cadastrado'})
      }
    
    }

    requisicao.nome = membroExistente.nome
    proximo()

    const membroAtualizado = await membroRepositorio.editar(dados, idMembro)
    return resposta.status(200).json(membroAtualizado)
  },
    /**
        * Lida com requisições DELETE recebendo o id de um membro e o removendo do banco de dados caso exista, caso contrário responde com um erro(404) 
        * @memberof membroControladora
        * @method remover
        * @param {Object} requisicao Parametro padrão e fornecido pelo Express, guarda as informações da requisição como corpo e o tipo
        * @param {Object} resposta Parametro padrão e fornecido pelo Express, guarda as informações da resposta como o corpo e o status
        * @returns {Promise} O retorno nessa função é desnecessário e é feito só para não gerar confusão quanto ao fim da função, o que importa é a chamada dos metodos do objeto "resposta", essa chamada seleciona um status para o resposta e prepara o conteudo
    */
  remover: async function (requisicao, resposta,proximo) {
    const idMembro = requisicao.params.id
    const membroExiste = await membroRepositorio.buscarUm(idMembro)
    const permissaoDoUsuario = requisicao.permissao
    
    if (permissaoDoUsuario > 3) {
      return resposta.status(401).json({erro : 'Acesso Não Autorizado'})
    }

   if (!membroExiste) {
      return resposta.status(404).json({erro : 'Membro Não Encontrado'})
    }

    await membroRepositorio.remover(idMembro)
    requisicao.nome = membroExiste.nome
    proximo()
    return resposta.status(200).json({resultado :'Membro Deletado Com Sucesso'})
  },
    /**
        * Lida com requisições PATCH recebendo o nome de um membro e uma senha, alterando-a, caso contrário responde com um erro(404) 
        * @memberof membroControladora
        * @method mudarSenha
        * @param {Object} requisicao Parametro padrão e fornecido pelo Express, guarda as informações da requisição como corpo e o tipo
        * @param {Object} resposta Parametro padrão e fornecido pelo Express, guarda as informações da resposta como o corpo e o status
        * @returns {Promise} O retorno nessa função é desnecessário e é feito só para não gerar confusão quanto ao fim da função, o que importa é a chamada dos metodos do objeto "resposta", essa chamada seleciona um status para o resposta e prepara o conteudo
    */  
  mudarSenha: async function (requisicao, resposta, proximo) {
    const idMembro = requisicao.params.id
    const senha = requisicao.body.senha
    const permissaoDoUsuario = requisicao.permissao
    const usuarioLogado = requisicao.usuario

    if (permissaoDoUsuario === 5) {
      const membro = await membroRepositorio.buscarUmPor('nome', usuarioLogado)
      if (membro.id_membro != idMembro) {
        return resposta.status(401).json({erro : 'Acesso Não Autorizado'})
      }
    } else if (permissaoDoUsuario > 3) {
      return resposta.status(401).json({erro : 'Acesso Não Autorizado'})
    }

    if(!senha){
      return resposta.status(404).json({erro : 'Campo de Senha Vazio'})
    }

    membroExiste = await membroRepositorio.buscarUm(idMembro)

    if(!membroExiste){
      return resposta.status(404).json({erro : 'Membro Não Existente'})
    }

    const sal = await bcrypt.genSalt()
		const hash = await bcrypt.hash(senha, sal)
    
    await membroRepositorio.mudarSenha(hash,idMembro)
    requisicao.nome = membroExiste.nome
    proximo()
    return resposta.status(200).json({resultado: 'Senha Alterada Com Sucesso'})
  }

}

module.exports = MembroControladora