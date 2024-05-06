/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/**
* @name FB - Execute approve transfer - MR
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Descripción
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> Fecha
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> Registro en Netsuite <_fb_execute_approve_tras_mr>
*/
define(['N/log', 'N/record', 'N/runtime', 'N/task', 'N/search'],
    /**
     * @param{log} log
     * @param{record} record
     * @param{runtime} runtime
     * @param{task} task
     */

    (log, record, runtime, task, search) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            try {
                var ids = JSON.parse(runtime.getCurrentScript().getParameter({ name: 'custscript_fb_id_transaction_to_approve' }));
                log.debug({ title: 'ID para recorrido:', details: ids });
                if (ids.typeTran === 'customtransaction_imr_traspaso_de_presup') {
                    let rdTransfer = record.load({ type: ids.typeTran, id: ids.idRecord, isDynamic: true })
                    let isMultiSub = rdTransfer.getValue({ fieldId: 'custbody_fb_check_multi_sub' });
                    let idBudget = rdTransfer.getValue({ fieldId: 'custbody_imr_custom_budget_tomado' });
                    let nameBudget = rdTransfer.getText({ fieldId: 'custbody_imr_custom_budget_tomado' });

                    log.audit({ title: 'isMultiSub', details: isMultiSub });
                    let noLines = rdTransfer.getLineCount({ sublistId: 'line' });
                    let arrLinesObj = [];
                    // obtenTiposDeCambio()
                    log.audit({ title: 'Numero de lineas:', details: noLines });
                    for (let index = 0; index < noLines; index++) {
                        let objAux = {};
                        rdTransfer.selectLine({ sublistId: 'line', line: index });
                        let idBudgetLine = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_budget_generado_por_trasla', line: index });
                        let lineaModificar = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_pr_line_nom', line: index }) || null;
                        // objAux.idBudgetCred = idBudget;
                        objAux.idBudgetDebit = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_budget_generado_por_trasla', line: index }) || idBudget;
                        objAux.nameBudget = nameBudget;
                        objAux.generateBudget = ((idBudget !== idBudgetLine && isMultiSub === true) ? true : false);
                        objAux.amount = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_import_mirror', line: index });
                        objAux.idSubsidiaria = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_subsidiary_to_transfer', line: index });
                        let nameSub = rdTransfer.getSublistText({ sublistId: 'line', fieldId: 'custcol_fb_subsidiary_to_transfer', line: index });
                        if (nameSub) {
                            nameSub = nameSub.split(':')
                            objAux.nameSubsidiaria = nameSub[(nameSub.length - 1)];
                        } else {
                            objAux.nameSubsidiaria = '';
                        }
                        objAux.idDepartment = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_department_debit', line: index }) || rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'department', line: index });
                        objAux.idAccount = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'account', line: index });
                        objAux.idClass = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'class', line: index });
                        objAux.idPeriod = rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_budget_period_', line: index });
                        objAux.lineBudget = parseInt(rdTransfer.getSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_pr_line_nom', line: index })) - 1;
                        objAux.lineTransfer = index;
                        arrLinesObj.push(objAux);
                    }
                    // let objAgr = arrLinesObj.reduce((grupo, line) => {
                    //     let idSubsidiaria = line.idSubsidiaria;
                    //     if (!grupo[idSubsidiaria]) {
                    //         grupo[idSubsidiaria] = [];
                    //     }
                    //     grupo[idSubsidiaria].push(line)

                    //     return grupo;
                    // }, {});
                    log.debug({ title: 'Datos a generar:', details: arrLinesObj });
                    return arrLinesObj;
                } else {
                    return [];
                }
            } catch (e) {
                log.error({ title: 'Error getInputData:', details: e });
            }

        }
        function obtenTiposDeCambio(filterToGetCurrency) {
            try {
                let arrInfoTipoCambio = [];
                var transactionSearchObj = search.create({
                    title: 'FB | Tipo de cambio',
                    type: 'currencyrate',
                    filters: filterToGetCurrency,
                    columns:
                        [
                            search.createColumn({ name: "baseCurrency" }),
                            search.createColumn({ name: "effectiveDate" }),
                            search.createColumn({ name: "exchangeRate" }),
                            search.createColumn({ name: "transactionCurrency" }),
                        ]
                });
                var searchResultCount = transactionSearchObj.runPaged().count;
                log.debug("transactionSearchObj result count", searchResultCount);

                var myPagedResults = transactionSearchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = myPagedResults.pageRanges;
                // Recorrido para los budgets
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({ index: thePageRanges[i].index });
                    thepageData.data.forEach(function (result) {
                        log.audit({ title: 'result', details: result });
                        var cadenaFecha = result.getValue({ name: 'effectiveDate' })
                        var partes = cadenaFecha.split('/');
                        var fechaFormateada = '';
                        if (partes[2] > partes[1] && partes[2] > partes[0]) {
                            fechaFormateada = partes[1] + '/' + partes[0] + '/' + partes[2];
                        } else {
                            fechaFormateada = cadenaFecha
                        }
                        let objAux = {
                            baseCurrency: result.getValue({ name: 'baseCurrency' }),
                            effectiveDate: new Date(fechaFormateada),
                            exchangeRate: result.getValue({ name: 'exchangeRate' }),
                            transactionCurrency: result.getValue({ name: 'transactionCurrency' })
                        }
                        log.debug({ title: 'objAux', details: objAux });
                        let existe = arrInfoTipoCambio.find((ajuste) => ajuste.baseCurrency === objAux.baseCurrency && ajuste.transactionCurrency === objAux.transactionCurrency)
                        if (existe) {
                            // Se encontro que el pibote es el mas alto
                            let masAlto = arrInfoTipoCambio.find((ajuste) =>
                                ajuste.baseCurrency === objAux.baseCurrency &&
                                ajuste.transactionCurrency === objAux.transactionCurrency &&
                                objAux.effectiveDate.getTime() > ajuste.effectiveDate.getTime())
                            log.debug({ title: 'masAlto', details: masAlto });
                            if (masAlto) {
                                arrInfoTipoCambio = arrInfoTipoCambio.filter(function (obj) { return obj.baseCurrency !== objAux.baseCurrency && obj.transactionCurrency !== objAux.transactionCurrency });
                                arrInfoTipoCambio.push(objAux);
                            }
                        } else {
                            arrInfoTipoCambio.push(objAux)
                        }
                        return true;
                    });
                }
                /*
                transactionSearchObj.id="customsearch1694471842228";
                transactionSearchObj.title="FB - Obten custom budgets (copy)";
                var newSearchId = transactionSearchObj.save();
                */
                return arrInfoTipoCambio
            } catch (e) {
                log.error({ title: 'Error obtenTiposDeCambio:', details: e });
                return []
            }
        }
        function getCurrencyBySubsidiaria(arrIdSub) {
            try {
                let arrObjSub = []
                var subsidiarySearchObj = search.create({
                    type: "subsidiary",
                    filters:
                        [
                            ["internalid", "anyof", arrIdSub]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "name", sort: search.Sort.ASC, label: "Nombre" }),
                            search.createColumn({ name: "currency", label: "Moneda" })
                        ]
                });
                var searchResultCount = subsidiarySearchObj.runPaged().count;
                log.debug("subsidiarySearchObj result count", searchResultCount);
                subsidiarySearchObj.run().each(function (result) {
                    arrObjSub.push({
                        id: result.getValue({ name: 'internalid' }),
                        name: result.getValue({ name: 'name' }),
                        currency: result.getValue({ name: 'currency' }),
                    })
                    return true;
                });

                /*
                subsidiarySearchObj.id="customsearch1697046197540";
                subsidiarySearchObj.title="FB - Obten  moneda de Subsidiaria - SS (copy)";
                var newSearchId = subsidiarySearchObj.save();
                */
                return arrObjSub;
            } catch (e) {
                log.error({ title: 'Error getCurrencyBySubsidiaria:', details: e });
                return []
            }
        }
        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        // En este Stage es usado para poder generar las los Custom Budget en caso de ser necesarios, con la oportunidad de pasar al siguiente paso para poder modificar las lineas del budget.
        const map = (mapContext) => {
            try {
                var ids = JSON.parse(runtime.getCurrentScript().getParameter({ name: 'custscript_fb_id_transaction_to_approve' }));
                log.debug({ title: 'mapContext', details: mapContext });
                log.debug({ title: 'mapContext', details: mapContext.key });
                let idsTraslados = [], idPeriods = [], arrIdSub = [];
                let lineasTransfer = JSON.parse(mapContext.value)
                log.audit({ title: 'Lineas por cargar:', details: lineasTransfer });
                let idSubsidiaria = mapContext.key;
                var rdTransfer = record.load({ type: ids.typeTran, id: ids.idRecord, isDynamic: true })
                let idSubsidiariaTransfer = rdTransfer.getValue({ fieldId: 'subsidiary' });
                arrIdSub.push(idSubsidiariaTransfer)
                arrIdSub.push(lineasTransfer.idSubsidiaria)
                let arrObjSub = getCurrencyBySubsidiaria(arrIdSub);
                log.debug({ title: 'Data from subsidiaria:', details: { arrIdSub, arrObjSub } });
                var objSubTran = arrObjSub.find((sub) => sub.id === idSubsidiariaTransfer);
                log.debug({ title: 'objSubTran', details: { idSubsidiariaTransfer, objSubTran } });

                let filterToGetCurrency = [];
                // Generando filtros para obtener el tipo de moneda
                arrObjSub.forEach((sub, index) => {
                    if (sub.idSubsidiaria !== idSubsidiariaTransfer) {
                        log.debug({ title: 'sub', details: sub });
                        if (index === (arrObjSub.length - 1)) {
                            filterToGetCurrency.push(['transactionCurrency', search.Operator.IS, sub.currency], 'AND', ['baseCurrency', search.Operator.IS, objSubTran.currency])
                        } else {
                            filterToGetCurrency.push(['transactionCurrency', search.Operator.IS, sub.currency], 'AND', ['baseCurrency', search.Operator.IS, objSubTran.currency], 'OR')
                        }
                    }
                });
                log.audit({ title: 'filterToGetCurrency', details: filterToGetCurrency });
                let dataCurrency = obtenTiposDeCambio(filterToGetCurrency);
                log.debug({ title: 'dataCurrency', details: dataCurrency });
                // Se añaden los tipos de cambio de acuerdo a la subsidiaria

                let arrCurrencyChange = [];
                var objSubTranCurr = arrObjSub.find((subPib) => subPib.id === lineasTransfer.idSubsidiaria);
                dataCurrency.forEach(currency => {
                    if (objSubTranCurr.currency === currency.baseCurrency) {
                        arrCurrencyChange.push(currency);
                    }
                })
                lineasTransfer.transactionCurrency = objSubTranCurr.currency;
                lineasTransfer.typeChange = arrCurrencyChange;

                // // Modifica el Budget Original
                // var customBudgetCredit = record.load({ type: 'customtransaction_bm_budget_transaction', id: lineasTransfer.idBudgetCred, isDynamic: true });
                // var currencyBudgetCredit = customBudgetCredit.getValue({ fieldId: 'currency' });

                // log.debug({ title: 'lineasTransfer', details: lineasTransfer });
                // var typeChange = lineasTransfer.typeChange.find((tipo) => tipo.baseCurrency === currencyBudgetCredit && tipo.transactionCurrency === lineasTransfer.transactionCurrency)
                // customBudgetCredit.selectLine({ sublistId: 'line', line: lineasTransfer.lineBudget });
                // var presupuestoRestante = parseFloat((customBudgetCredit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante' }) !== '' ? customBudgetCredit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante' }) : customBudgetCredit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'amount' })));
                // var montoTraspaso = (objSubTran.currency !== lineasTransfer.typeChange.baseCurrency ? (lineasTransfer.amount / parseFloat(typeChange.exchangeRate)) : lineasTransfer.amount);
                // presupuestoRestante = presupuestoRestante - montoTraspaso;
                // if (presupuestoRestante >= 0) {
                //     log.audit({ title: 'Montos finales para el budget de credito:', details: { Monto_Original: lineasTransfer.amount, Monto_Convertido: montoTraspaso, Presupuesto_Restante: presupuestoRestante } });
                //     customBudgetCredit.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante', value: presupuestoRestante, ignoreFieldChange: true });
                // }
                // customBudgetCredit.commitLine({ sublistId: 'line' });
                // // customBudgetCredit.save({ enableSourcing: true, ignoreMandatoryFields: true })


                // Modifica el Budget destino
                let idLineaDebito = obtainLineToBudget(lineasTransfer);
                log.debug({ title: 'idLineaDebito', details: idLineaDebito });
                log.debug({ title: 'ID de la linea de Debito', details: ((idLineaDebito === -2 ? 'No se puede hacer movimiento, existe mas de una linea que coincide con lo que se desea modificar' : idLineaDebito) || 'No existe una linea, se requiere introducir una') });
                if (idLineaDebito !== null && idLineaDebito !== -2 && idLineaDebito !== -1) {
                    idLineaDebito = parseInt(lineasTransfer.lineBudget);
                    var customBudgetDebit = record.load({ type: 'customtransaction_bm_budget_transaction', id: lineasTransfer.idBudgetDebit, isDynamic: true });
                    var currencyBudgetDebit = customBudgetDebit.getValue({ fieldId: 'currency' });

                    log.debug({ title: 'lineasTransfer', details: lineasTransfer });
                    var typeChange = lineasTransfer.typeChange.find((tipo) => tipo.baseCurrency === currencyBudgetDebit && tipo.transactionCurrency === lineasTransfer.transactionCurrency)
                    customBudgetDebit.selectLine({ sublistId: 'line', line: idLineaDebito });
                    var presupuestoRestanteAdicionado = parseFloat((customBudgetDebit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante' }) !== '' ? customBudgetDebit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante' }) : customBudgetDebit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'amount' })));
                    var montoTraspasoAdicionado = (objSubTran.currency !== lineasTransfer.typeChange.baseCurrency ? (lineasTransfer.amount / parseFloat(typeChange.exchangeRate)) : lineasTransfer.amount);
                    log.debug({ title: 'Montos a sumar:', details: presupuestoRestanteAdicionado + ' + ' + montoTraspasoAdicionado });
                    log.debug({ title: 'Monto restante:', details: customBudgetDebit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante' }) });
                    log.debug({ title: 'Monto original:', details: customBudgetDebit.getCurrentSublistValue({ sublistId: 'line', fieldId: 'amount' }) });
                    presupuestoRestanteAdicionado = presupuestoRestanteAdicionado + montoTraspasoAdicionado;
                    // if (presupuestoRestante >= 0) {
                    log.audit({ title: 'Montos finales para el budget de debito:', details: { Monto_Original: lineasTransfer.amount, Monto_Convertido: montoTraspasoAdicionado, Presupuesto_actualizado: presupuestoRestanteAdicionado } });
                    customBudgetDebit.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante', value: presupuestoRestanteAdicionado, ignoreFieldChange: true });
                    // }
                    customBudgetDebit.commitLine({ sublistId: 'line' });
                    customBudgetDebit.save({ enableSourcing: true, ignoreMandatoryFields: true })
                } else if (idLineaDebito !== null && idLineaDebito !== -2 && idLineaDebito === -1) {
                    log.debug({ title: 'Se esta generando una nueva linea para el Budget', details: true });
                    var customBudgetNewLine = record.load({ type: 'customtransaction_bm_budget_transaction', id: lineasTransfer.idBudgetDebit, isDynamic: true });
                    var currencyBudgetNewLine = customBudgetNewLine.getValue({ fieldId: 'currency' });

                    log.debug({ title: 'lineasTransfer', details: lineasTransfer });
                    var typeChange = lineasTransfer.typeChange.find((tipo) => tipo.baseCurrency === currencyBudgetNewLine && tipo.transactionCurrency === lineasTransfer.transactionCurrency)
                    var montoTraspasoInicial = (objSubTran.currency !== lineasTransfer.typeChange.baseCurrency ? (lineasTransfer.amount / parseFloat(typeChange.exchangeRate)) : lineasTransfer.amount);
                    // if (presupuestoRestante >= 0) {
                    customBudgetNewLine.selectNewLine({ sublistId: 'line' });
                    customBudgetNewLine.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineasTransfer.idAccount, ignoreFieldChange: true, forceSyncSourcing: true });
                    customBudgetNewLine.setCurrentSublistValue({ sublistId: 'line', fieldId: 'amount', value: montoTraspasoInicial, ignoreFieldChange: true, forceSyncSourcing: true });
                    customBudgetNewLine.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: lineasTransfer.idClass, ignoreFieldChange: true, forceSyncSourcing: true });
                    customBudgetNewLine.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_bm_line_bdg_period', value: lineasTransfer.idPeriod, ignoreFieldChange: true, forceSyncSourcing: true });
                    customBudgetNewLine.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_consumido', value: 0, ignoreFieldChange: true, forceSyncSourcing: true });
                    customBudgetNewLine.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante', value: montoTraspasoInicial, ignoreFieldChange: true, forceSyncSourcing: true });
                    customBudgetNewLine.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: lineasTransfer.idDepartment, ignoreFieldChange: true, forceSyncSourcing: true });
                    customBudgetNewLine.commitLine('line');
                    // }
                    customBudgetNewLine.save({ enableSourcing: true, ignoreMandatoryFields: true });


                    var customBudgetMoreNewLine = record.load({ type: 'customtransaction_bm_budget_transaction', id: lineasTransfer.idBudgetDebit, isDynamic: true });
                    let noLines = customBudgetMoreNewLine.getLineCount({ sublistId: 'line' });
                    log.debug({ title: 'noLines', details: noLines });

                    rdTransfer.selectLine({ sublistId: 'line', line: lineasTransfer.lineTransfer });
                    rdTransfer.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_pr_line_nom', value: noLines });
                    rdTransfer.commitLine('line');
                    rdTransfer.save({ enableSourcing: true, ignoreMandatoryFields: true });
                }
                // mapContext.write({
                //     key: mapContext.key,
                //     value: lineasTransfer
                // });
            } catch (e) {
                log.error({ title: 'Error map:', details: e });
            }

        }

        function obtainLineToBudget(lineasTransfer) {
            try {
                log.audit({ title: 'lineasTransfer', details: lineasTransfer });
                var lineaId = '';
                var transactionSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["type", "anyof", "Custom107"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["internalid", "anyof", lineasTransfer.idBudgetDebit],
                            "AND",
                            ["account", "anyof", lineasTransfer.idAccount],
                            "AND",
                            ["department", "anyof", lineasTransfer.idDepartment],
                            "AND",
                            ["class", "anyof", lineasTransfer.idClass],
                            "AND",
                            ["custcol_bm_line_bdg_period", "anyof", lineasTransfer.idPeriod],
                        ],
                    columns:
                        [
                            search.createColumn({ name: "line", label: "ID de línea" }),
                            search.createColumn({ name: "custcol_bm_line_bdg_period", label: "Budget Period" }),
                            search.createColumn({ name: "account", label: "Cuenta" }),
                            search.createColumn({ name: "department", label: "Departamento" }),
                            search.createColumn({ name: "class", label: "Clase" }),
                            search.createColumn({ name: "amount", label: "Importe" }),
                            search.createColumn({ name: "custcol_imr_presu_restante", label: "Prespuesto restante" })
                        ]
                });
                var searchResultCount = transactionSearchObj.runPaged().count;
                log.debug("transactionSearchObj result count", searchResultCount);
                let amountMore = 0;
                transactionSearchObj.run().each(function (result) {
                    let montoPib = parseFloat(result.getValue({ name: 'custcol_imr_presu_restante' })) || parseFloat(result.getValue({ name: 'amount' }));
                    if (montoPib > amountMore) {
                        lineaId = result.getValue({ name: 'line' });
                        amountMore = montoPib
                    }
                    return true;
                });

                /*
                transactionSearchObj.id="customsearch1698334857507";
                transactionSearchObj.title="Custom Búsqueda de Transacción 2 (copy)";
                var newSearchId = transactionSearchObj.save();
                */
                let sts;
                switch (searchResultCount) {
                    case 0:
                        sts = -1;
                        break;
                    case 1:
                        sts = lineaId;
                        break;
                    default:
                        sts = lineaId;
                        break;
                }
                return sts
            } catch (e) {
                log.error({ title: 'Error obtainLineToBudget:', details: e });
                return null;
            }
        }
        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
               
            } catch (e) {
                log.error({ title: 'Error reduce:', details: e });
            }

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        return { getInputData, map, reduce, summarize }

    });
