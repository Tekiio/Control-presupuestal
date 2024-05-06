/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/runtime', 'N/task', 'N/search'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{runtime} runtime
 * @param{task} task
 */
    /**
    * @name FB - Load
    * @version 1.0
    * @author Ricardo López <ricardo.lopez@freebug.mx>
    * @summary Descripción
    * @copyright Tekiio México 2022
    * 
    * Cliente       -> Cliente
    * Last modification  -> Fecha
    * Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
    * Script in NS    -> Registro en Netsuite <ID del registro>
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
                var ids = runtime.getCurrentScript().getParameter({ name: 'custscript_fb_id_seguimiento' });
                var objAux = runtime.getCurrentScript().getParameter({ name: 'custscript_fb_load_to_obj_budget' });
                objAux = JSON.parse(objAux)
                log.audit({ title: 'ids', details: ids });
                log.audit({ title: 'objAux', details: objAux });
                log.debug({ title: 'inputContext', details: inputContext });
                let newArr = [];
                for (line in objAux) {
                    newArr = newArr.concat(objAux[line])
                }
                // se agrupa por budget y linea del CSV, para que de esta forma se use el id del budget para generar el traslado
                let objAgr = newArr.reduce((grupo, line) => {
                    let idBudget = line.idBudgetCred;
                    let lineCSV = line.lineCSV;
                    let idDepartment = line.idDepartment;
                    if (!grupo[idBudget]) {
                        grupo[idBudget] = {};
                    }
                    if (!grupo[idBudget][lineCSV]) {
                        grupo[idBudget][lineCSV] = [];
                    }
                    grupo[idBudget][lineCSV].push(line)

                    return grupo;
                }, {});

                let arrData = [];
                // Recorre los budgets separando las lineas que dan el presupuesto y las que la reciben, sin considerar las lineas que coinciden en subsidiaria y departamento
                for (idBud in objAgr) {
                    // Recorre las lineas para realizar las modificaciones
                    for (idLine in objAgr[idBud]) {
                        let objAgrupador = { body: {}, data: [] };
                        let objBody = objAgr[idBud][idLine][0];
                        // Se obtiene los datos de cabecera
                        for (key in objBody) {
                            objAgrupador.body[key] = objBody[key];
                        }
                        for (let i = 0; i < objAgr[idBud][idLine].length; i++) {
                            objAgrupador.data.push(objAgr[idBud][idLine][i])
                        }
                        arrData.push(objAgrupador)
                    }
                }
                // Re-agrupa los arreglos por linea para 
                let arrDataGrouped = [];
                arrData.forEach((ppto, index) => {
                    log.audit({ title: 'ppto', details: ppto });
                    log.audit({ title: 'arrDataGrouped', details: arrDataGrouped });
                    let dataGroupedPib = arrDataGrouped.find((line) =>
                        ppto.body.idSubsidiaria === line.body.idSubsidiaria &&
                        ppto.body.idDepartment === line.body.idDepartment &&
                        ppto.body.idBudget === line.body.idBudget) || null;
                    // Si encuentra una coincidencia, quiere decir que realmente hay un presupuesto que va a ir en la misma linea
                    if (dataGroupedPib) {
                        arrDataGrouped.map((lineaPib) => {
                            log.audit({ title: 'lineaPib', details: lineaPib });
                            if (ppto.body.idSubsidiaria === lineaPib.body.idSubsidiaria &&
                                ppto.body.idDepartment === lineaPib.body.idDepartment &&
                                ppto.body.idBudget === lineaPib.body.idBudget) {
                                let arr = lineaPib.data;
                                arr = arr.concat(ppto.data);
                                lineaPib.data = arr
                            }
                        }, {})
                    } else {
                        arrDataGrouped.push(ppto)
                    }
                })
                log.audit({ title: 'arrDataGrouped', details: arrDataGrouped });
                log.audit({ title: 'Objeto agrupador por Budget y linea', details: objAgr });
                log.audit({ title: 'Arreglo que separa los budgets del objeto', details: arrData });
                return arrDataGrouped;
            } catch (e) {
                log.error({ title: 'Error getInputData:', details: e });
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

        const map = (mapContext) => {
            try {
                var ids = runtime.getCurrentScript().getParameter({ name: 'custscript_fb_id_seguimiento' });
                log.debug({ title: 'mapContext', details: mapContext });
                let idsTraslados = []
                let valueMap = JSON.parse(mapContext.value)
                log.audit({ title: 'Lineas por cargar:', details: valueMap });
                log.audit({ title: 'Cantidad de lineas por cargar:', details: valueMap.data.length });
                // Genera la transaccion con el arreglo de objetos obtenido del suitelet
                // Consideraciones 
                // 1.- Anteriomente se agrupo por subsidiaria
                // 2.- Tambien se agrupo por Presupuesto (Custom Budget)
                let traslado = record.create({ type: 'customtransaction_imr_traspaso_de_presup', isDynamic: true });
                let idSubsidiaria = valueMap.body.idSubsidiaria;
                let idDepartment = valueMap.body.idDepartment;
                let idBudget = valueMap.body.idBudgetCred;
                let nameBudget = `Custom Budget #${valueMap.body.budget}`;

                let validaSub = false;
                for (let iter = 0; iter < valueMap.data.length; iter++) {
                    if (valueMap.data[iter].idSubsidiaria !== idSubsidiaria) {
                        validaSub = true;
                        break;
                    }
                }
                let chapter = obtenChapters(idDepartment);
                log.debug({ title: 'chapter', details: chapter });
                traslado.setValue({ fieldId: 'subsidiary', value: idSubsidiaria });
                traslado.setValue({ fieldId: 'custbody_imr_custom_budget_tomado', value: idBudget });
                traslado.setValue({ fieldId: 'custbody_imr_custom_budget_id', value: idBudget });
                traslado.setValue({ fieldId: 'custbody_imr_custom_budget_name', value: nameBudget });
                traslado.setValue({ fieldId: 'custbody_imr_departamento_solicitud', value: idDepartment });
                traslado.setValue({ fieldId: 'custbody_fb_check_multi_sub', value: validaSub });
                traslado.setValue({ fieldId: 'custbody_imr_chapter', value: chapter });

                let lineaCredito = null;
                for (let linea = 0; linea < valueMap.data.length; linea++) {
                    let lineaPib = valueMap.data[linea];
                    lineaCredito = (lineaPib.TypeMov === '-' ? lineaPib : lineaCredito);
                    let esCredito = (lineaPib.TypeMov === '-' ? true : false)
                    if (!esCredito) {
                        log.debug({ title: 'lineaCredito', details: lineaCredito });
                        log.debug({ title: 'lineaPib', details: lineaPib });
                        traslado.selectNewLine('line');
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineaPib.idAccount, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'amount', value: parseFloat(lineaPib.amount_original), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_subsidiary_to_transfer', value: lineaPib.idSubsidiaria, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: idDepartment, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_department_debit', value: lineaPib.idDepartment, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: lineaPib.idClass, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_budget_period_', value: lineaPib.idPeriod, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_import_mirror', value: lineaPib.amount, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presupuesto_consumido', value: parseFloat(lineaPib.amount_consum), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presupuesto_restante_para', value: parseFloat(lineaPib.amount_restante), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_budget_amount_prsonal', value: parseFloat(lineaPib.amount_original), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_pr_line_nom', value: lineaPib.line, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_budget_generado_por_trasla', value: lineaPib.idBudgetDeb, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineaPib.memo, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.commitLine('line');
                    } else {
                        traslado.selectNewLine('line');
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineaCredito.idAccount, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'amount', value: parseFloat(lineaPib.amount_original), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_subsidiary_to_transfer', value: lineaCredito.idSubsidiaria, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: idDepartment, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_department_debit', value: lineaCredito.idDepartment, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: lineaCredito.idClass, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_budget_period_', value: lineaCredito.idPeriod, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_import_mirror', value: -1 * parseFloat(lineaCredito.amount_restado), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presupuesto_consumido', value: parseFloat(lineaCredito.amount_consum), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presupuesto_restante_para', value: parseFloat(lineaCredito.amount_restante), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_budget_amount_prsonal', value: parseFloat(lineaCredito.amount_original), ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_pr_line_nom', value: lineaCredito.line, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_budget_generado_por_trasla', value: lineaCredito.idBudgetCred, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineaCredito.memo, ignoreFieldChange: true, forceSyncSourcing: true });
                        traslado.commitLine('line');
                    }
                }
                let idTraslado = traslado.save({ enableSourcing: true, ignoreMandatoryFields: true });
                idsTraslados.push(idTraslado)
                // Genera los registros de seguimiento para poder visualizar dentro de la pantalla de carga
                valueMap.data.forEach(linea => {
                    let registroLinea = record.create({ type: 'customrecord_fb_traslado_generado_ppm', isDynamic: true });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_group_generated', value: ids });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_budget_usage', value: linea.idBudgetDeb });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_type_movement', value: linea.TypeMov });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_amount_to_line', value: parseFloat(linea.amount) });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_subsidiary_to_line', value: linea.idSubsidiaria });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_account_to_line', value: linea.idAccount });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_department_to_line', value: linea.idDepartment });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_class_to_line', value: linea.idClass });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_memo_description_to_line', value: linea.memo });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_periodo_into_tm', value: linea.idPeriod });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_linea_modificada', value: linea.line });
                    registroLinea.setValue({ fieldId: 'custrecord_fb_traslado_generado', value: idTraslado });
                    let idRdLinea = registroLinea.save({ enableSourcing: true, ignoreMandatoryFields: true });
                })

                mapContext.write({
                    key: mapContext.key,
                    value: {
                        arrValues: valueMap,
                        idsTraslados: idsTraslados
                    }
                });
            } catch (e) {
                log.error({ title: 'Error map:', details: e });
            }

        }

        function obtenChapters(idDepartment) {
            try {
                let arrIdApprove = [];
                var arrChapter = [];
                var transactionSearchObj = search.create({
                    type: 'employee',
                    filters: [
                        ["custentity_imr_es_chapter", "is", "T"],
                        "AND",
                        ["custentity_imr_departamentos_a_los_que_a", "anyof", idDepartment],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" })
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
                        arrIdApprove.push(result.getValue({ name: 'internalid' }))
                        arrChapter.push({ emp: result.getValue({ name: 'internalid' }), no: 0 })
                        return true;
                    });
                }
                log.audit({ title: 'arrIdApprove', details: arrIdApprove });
                let countChapter = []
                var searchChapter = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["type", "anyof", "Custom116"],
                            "AND",
                            ["custbody_imr_chapter", "anyof", arrIdApprove],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["status", "anyof", "Custom116:A"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custbody_imr_chapter", summary: "COUNT", label: "IMR - CHAPTER" }),
                            search.createColumn({ name: "custbody_imr_chapter", summary: "GROUP", label: "IMR - CHAPTER" })
                        ]
                });
                var searchResultCount = searchChapter.runPaged().count;
                log.debug("Buscando chapter result count", searchResultCount);
                searchChapter.run().each(function (result) {
                    let noCount = parseInt(result.getValue({ name: "custbody_imr_chapter", summary: "COUNT" }))
                    let employee = result.getValue({ name: "custbody_imr_chapter", summary: "GROUP" })
                    countChapter.push({ emp: employee, no: noCount })
                    return true;
                });
                arrChapter.map((chapter) => {
                    let chapterFind = countChapter.find(chap => chap.emp === chapter.emp);
                    if (chapterFind) {
                        chapter.no = chapterFind.no
                    }
                })
                // Supongamos que tienes un arreglo de objetos con un atributo numérico "valor"

                // Utilizamos reduce para encontrar el objeto con el valor más pequeño
                const objetoConValorMasPequeno = arrChapter.reduce((menor, objeto) => {
                    return objeto.valor < menor.valor ? objeto : menor;
                }, arrChapter[0]);
                /*
                transactionSearchObj.id="customsearch1697207108802";
                transactionSearchObj.title="Custom Búsqueda de Transacción (copy)";
                var newSearchId = transactionSearchObj.save();
                */
                return objetoConValorMasPequeno.emp || ''
            } catch (e) {
                log.error({ title: 'Error obtenChapters:', details: e });
                return ''
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
                var ids = runtime.getCurrentScript().getParameter({ name: 'custscript_fb_id_seguimiento' });
                log.debug({ title: 'reduceContext', details: reduceContext });

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
