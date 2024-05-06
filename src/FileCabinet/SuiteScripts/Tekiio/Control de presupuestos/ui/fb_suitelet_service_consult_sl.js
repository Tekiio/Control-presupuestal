/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/**
* @name FB - Suitelet de servicio de consulta - SL
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Envia informacion hacia los diferentes scripts que no tienen acceso en su totalidad
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> 19/09/2023
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> FB - Suitelet de servicio de consulta - SL <ID del registro>
*/
define(['N/log', 'N/search', 'N/record', 'N/task', 'N/url', 'N/email'],
    /**
 * @param{log} log
 * @param{search} search
 */
    (log, search, record, task, url, email) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try {
                log.audit({ title: 'scriptContext', details: scriptContext });
                let parametrosCustom = (scriptContext.request.method === 'POST' ? JSON.parse(scriptContext.request.body) : scriptContext.request.parameters)
                log.audit({ title: 'parametrosCustom', details: parametrosCustom });
                var params = parametrosCustom;
                var response = scriptContext.response;
                log.audit({ title: 'params', details: params });
                var op = params.operador;
                switch (op) {
                    case 'search_posicion_pptal':
                        let idAccount = params.idAccount
                        var fieldLookUp = search.lookupFields({ type: 'account', id: idAccount, columns: ['custrecord_fb_pos_presupuestal_body'] }) || null;
                        response.write({ output: JSON.stringify({ fieldLookUp }) });
                        break;
                    case 'update_line_transaction':
                        let objUpdateLine = params.objUpdateLine;
                        log.audit({ title: 'objUpdateLine', details: objUpdateLine });
                        let condicionUpdate = updateLineTransaction(objUpdateLine.idRecord, objUpdateLine.typeTrandActual, objUpdateLine.condicion, objUpdateLine.aprobador)
                        response.write({ output: JSON.stringify({ status: condicionUpdate }) });
                        break;
                    case 'update_budget_transaction':
                        let arrGrouped = params.arrGrouped;
                        log.audit({ title: 'arrGrouped', details: arrGrouped });
                        let condicionUpdateBudget = updateBudgetTransaction(arrGrouped, 'solped');
                        response.write({ output: JSON.stringify({ condicionUpdateBudget }) });
                        break;
                    case 'submit_fields_to_record':
                        let objSubmit = params.objSubmit
                        log.audit({ title: 'objSubmit', details: objSubmit });
                        record.submitFields(objSubmit);
                        response.write({ output: JSON.stringify({ status: 'update' }) });
                        break;
                    case 'search_info_budget':
                        let arrIdBudgets = params.arrIdBudgets
                        log.audit({ title: 'arrIdBudgets', details: arrIdBudgets });
                        let dataBudget = obtenInfoBudget(arrIdBudgets);
                        log.audit({ title: 'dataBudget', details: dataBudget });
                        response.write({ output: JSON.stringify({ dataBudget }) });
                        break;
                    case 'tracking_approval_status':
                        let objApproval = params.objApproval
                        var statusApproved = record.create({ type: 'customrecord_fb_state_approved', isDynamic: true });
                        statusApproved.setValue({ fieldId: "custrecord_fb_transaccion_aprobada", value: objApproval.idRecord || '' });
                        statusApproved.setValue({ fieldId: "custrecord_fb_employee_approving", value: objApproval.aprobadorActualId || '' });
                        statusApproved.setValue({ fieldId: "custrecord_fb_aprobador_field_rd", value: objApproval.aprobadorId || '' });
                        statusApproved.setValue({ fieldId: "custrecord_fb_status_approve_rd", value: (objApproval.condicion ? 2 : 3) });
                        let idStatusApproved = statusApproved.save({ enableSourcing: true, ignoreMandatoryFields: true });
                        log.audit({ title: 'objApproval', details: objApproval });
                        response.write({ output: JSON.stringify({ status: 'update' }) });
                        break;
                    case 'search_approval_group_department':
                        let idDep = params.idDep
                        var idGrupoAprobacion = search.lookupFields({ type: 'department', id: idDep, columns: ['custrecord_fb_dept_group_approve'] }) || null;
                        response.write({ output: JSON.stringify({ idGrupoAprobacion }) });
                        break;
                    case 'search_arr_approval_group':
                        var idGrupoAprobacion = params.idGrupoAprobacion
                        log.audit({ title: 'idGrupoAprobacion', details: idGrupoAprobacion });
                        let arrApprove = getAprobadores(idGrupoAprobacion);
                        log.audit({ title: 'arrApprove', details: arrApprove });
                        response.write({ output: JSON.stringify({ arrApprove }) });
                        break;
                    case 'search_budget_consumend':
                        let presupuesto = getBudget(params.tipo, params.departamento, params.clase, params.cuenta, params.periodo, params.subsidiaria);
                        let consumido = getBudgetConsumed(params.tipo, params.departamento, params.clase, params.cuenta, params.periodo, params.subsidiaria);
                        log.audit({ title: 'consumido', details: consumido });
                        response.write({ output: JSON.stringify({ presupuesto, consumido }) });
                        break;
                    case 'search_id_group_approver':
                        let arrIdGroupApproved = getListGroupApprover(params.idDepartamentos);
                        log.audit({ title: 'arrIdGroupApproved', details: arrIdGroupApproved });
                        response.write({ output: JSON.stringify({ arrIdGroupApproved }) });
                        break;
                    case 'generate_group_approval':
                        let registro = params.obj_generador.trand;
                        let arrAprobadores = params.obj_generador.dataAprobadores;
                        let condicion = generaGruposAprobacion(arrAprobadores, registro);
                        response.write({ output: JSON.stringify({ condicion }) });
                        break;
                    case 'sent_email_to_approver':
                        let objAux = params.objAux;
                        let condicionEmail = sentEmail(objAux)
                        response.write({ output: JSON.stringify({ condicionEmail }) });
                        break;
                    case 'update_line_budget_oc':
                        let valores = params;
                        log.audit({ title: 'valores', details: valores });
                        log.audit({ title: 'Tipo valores', details: typeof valores });
                        let obtainLinesToUpdate = obtainLines(valores);
                        response.write({ output: JSON.stringify({ actualizacion: true }) });
                        break;
                    case 'update_cancel_line_budget_oc':
                        let valores2 = params;
                        log.audit({ title: 'valores', details: valores2 });
                        log.audit({ title: 'Tipo valores', details: typeof valores2 });
                        let obtainLinesToUpdate2 = obtainLines(valores2);
                        response.write({ output: JSON.stringify({ actualizacion: true }) });
                        break;
                    case 'execute_task_map_reduce':
                        let idFile = params.idFile;
                        log.audit({ title: 'idFile', details: idFile });
                        var shTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_fb_update_group_approver_mr',
                            deploymentId: 'customdeploy_fb_update_group_approver_mr',
                            params: {
                                "custscript_fb_tracking_upload_group_appr": idFile
                            }
                        });
                        let idTask = shTask.submit();
                        record.submitFields({
                            type: 'customrecord_fb_config_group_approver',
                            id: idFile,
                            values: {
                                custrecord_fb_id_task_update_group: idTask
                            }
                        })
                        response.write({ output: JSON.stringify({ status: 'update' }) });
                        break;
                    case 'request_on_transfer':
                        log.audit({ title: 'Parametros para generar:', details: params });
                        let objTran = { idRecord: params.idRecord, typeTran: params.typeTran }
                        var shTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_fb_execute_approve_tras_mr',
                            deploymentId: 'customdeploy_fb_execute_approve_tras_mr',
                            params: {
                                "custscript_fb_id_transaction_to_approve": JSON.stringify(objTran)
                            }
                        });
                        let idTaskUb = shTask.submit();
                        log.audit({ title: 'idTaskUb', details: idTaskUb });
                        response.write({ output: JSON.stringify({ status: 'update', taskId: idTaskUb }) });
                        break;
                }
            } catch (e) {
                log.error({ title: 'Error onRequest:', details: e });
            }

        }
        function obtainLines(valores) {
            try {
                log.audit({ title: 'Parametros para la obtencion del registro:', details: { id: valores.idRecord, type: valores.typeTran } });
                log.audit({ title: 'Tipo de registro', details: record.Type.PURCHASE_ORDER });
                let arrLinesToApprove = [];
                let idsBudget = [];
                let arrGrouped = {};
                var rdTran = record.load({ type: valores.typeTran, id: valores.idRecord, isDynamic: true });
                log.audit({ title: 'rdTran', details: rdTran });
                let noLines = rdTran.getLineCount({ sublistId: 'item' })
                log.audit({ title: 'noLines', details: noLines });
                for (let index = 0; index < noLines; index++) {
                    let objAux = {};
                    rdTran.selectLine({ sublistId: 'item', line: index });
                    objAux.amount = rdTran.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: index });
                    objAux.account = rdTran.getSublistValue({ sublistId: 'item', fieldId: 'custcol_bm_itemaccount', line: index });
                    objAux.class = rdTran.getSublistValue({ sublistId: 'item', fieldId: 'class', line: index });
                    objAux.period = rdTran.getSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_periodo_sublist', line: index }) || rdTran.getSublistValue({ sublistId: 'item', fieldId: 'custcol_bm_line_bdg_period', line: index });
                    objAux.department = rdTran.getSublistValue({ sublistId: 'item', fieldId: 'department', line: index });
                    objAux.idBudget = rdTran.getSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', line: index });
                    objAux.line = ''
                    if (!idsBudget.includes(objAux.idBudget)) {
                        idsBudget.push(objAux.idBudget);
                    }
                    arrLinesToApprove.push(objAux);
                }
                log.audit({ title: 'idsBudget', details: idsBudget });
                let infoBudget = obtenInfoBudget(idsBudget);
                log.audit({ title: 'infoBudget', details: infoBudget });
                let contObtainOC = 0;
                let contObtainPay = 0;
                let contObtainSolped = 0;
                arrLinesToApprove.map(line => {
                    let lineToBudget = infoBudget.find((lineBudget) => (lineBudget.idBudget === line.idBudget) &&
                        (lineBudget.period === line.period) && (lineBudget.account === line.account) &&
                        (lineBudget.class === line.class) &&
                        (lineBudget.department === line.department)) || null;
                    if (lineToBudget) {
                        if (valores.typeTran === record.Type.PURCHASE_ORDER && (parseFloat(lineToBudget.amount_pre_com) >= parseFloat(line.amount))) {
                            log.audit({ title: 'lineToBudget', details: lineToBudget });
                            line.line = parseInt(lineToBudget.line) - 1;
                            contObtainOC++;
                        }
                        if (valores.typeTran === record.Type.VENDOR_BILL && (parseFloat(lineToBudget.amount_com) >= parseFloat(line.amount))) {
                            log.audit({ title: 'lineToBudget', details: lineToBudget });
                            line.line = parseInt(lineToBudget.line) - 1;
                            contObtainPay++;
                        }
                        if (valores.typeTran === record.Type.PURCHASE_REQUISITION) {
                            line.line = parseInt(lineToBudget.line) - 1;
                            contObtainSolped++;
                        }
                    }
                });
                log.audit({ title: 'arrLinesToApprove', details: arrLinesToApprove });
                log.audit({ title: 'Numero de lineas Transaccion vs Encontradas', details: { NoLinesTran: noLines, NoLinesEncon: contObtainOC } });
                // Se agrupa por budget
                arrGrouped = arrLinesToApprove.reduce((acc, line) => {
                    const key = line.idBudget;
                    if (!acc[key]) {
                        acc[key] = []
                    }
                    acc[key].push(line);
                    return acc;
                }, {});
                log.audit({ title: 'Lineas agrupadas:', details: arrGrouped });
                if (noLines === contObtainOC && record.Type.PURCHASE_ORDER === valores.typeTran) {
                    let actualizo = updateBudgetTransaction(arrGrouped, 'purchord')
                    return true
                }
                else if (noLines === contObtainPay && record.Type.VENDOR_BILL === valores.typeTran) {
                    let actualizo = updateBudgetTransaction(arrGrouped, 'vendpay')
                    return true
                }
                else if (noLines === contObtainSolped && record.Type.PURCHASE_REQUISITION === valores.typeTran) {
                    let actualizo = updateBudgetTransaction(arrGrouped, 'cancel_solped')
                    return true
                }
                else {
                    rdTran.setValue({ fieldId: 'approvalstatus', value: '1' })
                    return false
                }
            } catch (e) {
                log.error({ title: 'Error obtainLines:', details: e });
                return false
            }
        }

        function sentEmail(objAux) {
            try {
                // console.log({ title: 'Objeto para el envio', details: objAux });
                var output = url.resolveRecord({
                    recordType: objAux.typeTrand,
                    recordId: objAux.idTrand,
                    isEditMode: true
                });
                var emailresults = email.send({
                    author: -5,
                    recipients: objAux.id,
                    subject: 'Solicitud de aprobación',
                    body: `Se solicita la aprobación de la solicitud de compra adjunta. <a href="${output}">Link</a>`
                });
                log.debug("URL transaction", output);
            } catch (e) {
                log.error({ title: 'Error sentEmail:', details: e });
            }
        }
        function obtenInfoBudget(arrIdBudgets) {
            try {
                let arrInfoBudget = [];
                var transactionSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["type", "anyof", "Custom107"],
                            "AND",
                            ["internalid", "anyof", arrIdBudgets],
                            "AND",
                            ["mainline", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custcol_bm_line_bdg_period", label: "Period" }),
                            search.createColumn({ name: "account", label: "Account" }),
                            search.createColumn({ name: "class", label: "Class" }),
                            search.createColumn({ name: "amount", label: "Amount" }),
                            search.createColumn({ name: "custcol_fb_pre_comprometido_monto", label: "Monto pre comprometido" }),
                            search.createColumn({ name: "custcol_fb_comprometido_monto", label: "Monto comprometido" }),
                            search.createColumn({ name: "line", label: "Line ID" }),
                            search.createColumn({ name: "linesequencenumber", label: "Line Sequence Number" }),
                            search.createColumn({ name: "department", label: "Department" })
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
                        arrInfoBudget.push({
                            idBudget: result.id,
                            line: result.getValue({ name: 'line' }),
                            period: result.getValue({ name: 'custcol_bm_line_bdg_period' }),
                            account: result.getValue({ name: 'account' }),
                            class: result.getValue({ name: 'class' }),
                            amount: result.getValue({ name: 'amount' }) || '0',
                            amount_pre_com: result.getValue({ name: 'custcol_fb_pre_comprometido_monto' }) || '0',
                            amount_com: result.getValue({ name: 'custcol_fb_comprometido_monto' }) || '0',
                            department: result.getValue({ name: 'department' }),
                        })
                        return true;
                    });
                }

                /*
                transactionSearchObj.id="customsearch1694471842228";
                transactionSearchObj.title="FB - Obten custom budgets (copy)";
                var newSearchId = transactionSearchObj.save();
                */
                return arrInfoBudget
            } catch (e) {
                log.error({ title: 'Error ObtenInforBudget:', details: e });
                return []
            }
        }
        // Funcion que actualiza la lineas de la transaccion las cuales deben ser afectadas, en este caso es considerado el departamento como condicion principal, para que este coincida con el aprobador
        function updateLineTransaction(idRecord, typeTrandActual, condicion, aprobador) {
            try {
                let transactionPib = record.load({ type: typeTrandActual, id: idRecord, isDynamic: true });
                let noLines = transactionPib.getLineCount({ sublistId: 'item' });
                log.audit({ title: 'noLines', details: noLines });
                log.audit({ title: 'aprobador', details: aprobador });
                for (let index = 0; index < noLines; index++) {
                    let dep = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'department', line: index } || '0');
                    log.audit({ title: 'Departamentos', details: { DepLine: dep, depApprove: aprobador.departamento } });
                    if (aprobador.departamento === dep) {
                        transactionPib.selectLine({ sublistId: 'item', line: index });
                        // transactionPib.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_budget_status', value: (condicion ? 2 : 3), ignoreFieldChange: true });
                        transactionPib.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_budget_status', value: (condicion ? 2 : 3), ignoreFieldChange: true });
                        transactionPib.commitLine({ sublistId: 'item' });
                    }
                }
                transactionPib.save({ enableSourcing: true, ignoreMandatoryFields: true })
                return true
            } catch (e) {
                log.error({ title: 'Error updateLineTransaction:', details: e });
                return false
            }
        }
        function updateBudgetTransaction(arrGrouped, typeUpdate) {
            try {
                for (idBudget in arrGrouped) {
                    // Se carga el registro del budget para hacer las modificaciones a nivel linea
                    log.audit({ title: 'idBudget', details: idBudget });
                    let budgetPib = record.load({ type: 'customtransaction_bm_budget_transaction', id: idBudget, isDynamic: true });
                    let arrPib2 = arrGrouped[idBudget];
                    arrPib2.map((linePib) => {
                        if (linePib.line) {
                            budgetPib.selectLine({ sublistId: 'line', line: linePib.line });
                            // Se mantienen casos para mover los montos conforme se aprueban las solicitudes, ordenes de compra y pagos
                            switch (typeUpdate) {
                                case 'solped':
                                    // Obtiene el monto restante y lo compara para verificar si realizara la modificacion sobre el budget
                                    let montoRestante = (budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante' }) || 0) - linePib.amount;
                                    log.audit({ title: 'montoRestante', details: montoRestante });
                                    if (montoRestante >= 0) {
                                        budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante', value: montoRestante, ignoreFieldChange: true });
                                        let montoPreComprometido = (parseFloat(budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_pre_comprometido_monto' })) || 0) + linePib.amount;
                                        budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_pre_comprometido_monto', value: montoPreComprometido, ignoreFieldChange: true });
                                    }
                                    break;
                                case 'cancel_solped':
                                    // Obtiene el monto restante y lo compara para verificar si realizara la modificacion sobre el budget
                                    let montoComprometido_mas_cancelado = (budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_pre_comprometido_monto' }) || 0) - linePib.amount;
                                    log.audit({ title: 'montoRestante', details: montoComprometido_mas_cancelado });
                                    if (montoComprometido_mas_cancelado >= 0) {
                                        // budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_restante', value: montoRestante, ignoreFieldChange: true });
                                        // let montoPreComprometido = (parseFloat(budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_pre_comprometido_monto' })) || 0) + linePib.amount;
                                        // budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_pre_comprometido_monto', value: montoPreComprometido, ignoreFieldChange: true });
                                    }
                                    break;
                                case 'purchord':
                                    let montoPre_Comprometido = (budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_pre_comprometido_monto' }) || 0) - linePib.amount;
                                    log.audit({ title: 'Para aprobar orden de compra', details: montoPre_Comprometido });
                                    if (montoPre_Comprometido >= 0) {
                                        budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_pre_comprometido_monto', value: montoPre_Comprometido, ignoreFieldChange: true });
                                        let montoComprometido = (parseFloat(budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_comprometido_monto' })) || 0) + parseFloat(linePib.amount);
                                        budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_comprometido_monto', value: montoComprometido, ignoreFieldChange: true });
                                    }
                                    break;
                                case 'vendpay':
                                    let montoComprometido = (budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_comprometido_monto' }) || 0) - linePib.amount;
                                    log.audit({ title: 'Para aprobar pago', details: montoComprometido });
                                    if (montoComprometido >= 0) {
                                        budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_fb_comprometido_monto', value: montoComprometido, ignoreFieldChange: true });
                                        let montoEjecutado = (parseFloat(budgetPib.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_consumido' })) || 0) + parseFloat(linePib.amount);
                                        budgetPib.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_imr_presu_consumido', value: montoEjecutado, ignoreFieldChange: true });
                                    }
                                    break;
                                default:
                                    break;
                            }
                            budgetPib.commitLine({ sublistId: 'line' });
                        }
                    })
                    budgetPib.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                }
                return true
            } catch (e) {
                log.error({ title: 'Error updateBudgetTransaction:', details: e });
                return false
            }
        }
        function getListGroupApprover(ids) {
            try {
                let arrIdGroupApproved = []
                var departmentSearchObj = search.create({
                    type: "department",
                    filters:
                        [
                            ["internalid", "anyof", ids]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_fb_dept_group_approve", label: "Grupo de aprobación asignado" })
                        ]
                });
                var searchResultCount = departmentSearchObj.runPaged().count;
                log.debug("departmentSearchObj result count", searchResultCount);
                departmentSearchObj.run().each(function (result) {
                    arrIdGroupApproved.push(result.getValue({ name: 'custrecord_fb_dept_group_approve' }))
                    return true;
                });

                /*
                departmentSearchObj.id="customsearch1694558202871";
                departmentSearchObj.title="FB - obten grupo del departamento (copy)";
                var newSearchId = departmentSearchObj.save();
                */
                return arrIdGroupApproved;
            } catch (e) {
                log.error({ title: 'Error getListGroupApprover::', details: e });
                return [];
            }
        }
        function getAprobadores(id) {
            try {
                var customrecord_fb_entity_approverSearchObj = search.create({
                    type: "customrecord_fb_entity_approver",
                    filters:
                        [
                            ['custrecord_fb_id_group_approver', 'anyof', id]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "name", sort: search.Sort.ASC, label: "Name" }),
                            search.createColumn({ name: "custrecord_fb_posicion_approve", label: "Posicion" }),
                            search.createColumn({ name: "custrecord_fb_employee_approve", label: "Empleado" }),
                            search.createColumn({ name: "custrecord_fb_amount_approve", label: "Monto" }),
                            search.createColumn({ name: "custrecord_fb_departamento_approve", label: "departamento" })
                        ]
                });
                var searchResultCount = customrecord_fb_entity_approverSearchObj.runPaged().count;
                log.audit("No. de aprobadores disponibles en el departamento", searchResultCount);
                let arrApprove = [];
                customrecord_fb_entity_approverSearchObj.run().each(function (result) {
                    arrApprove.push({
                        id: result.id,
                        empleado: result.getValue({ name: "custrecord_fb_employee_approve" }),
                        monto: result.getValue({ name: "custrecord_fb_amount_approve" }),
                        posicion: result.getValue({ name: "custrecord_fb_posicion_approve" }),
                        departamento: result.getValue({ name: "custrecord_fb_departamento_approve" }),
                        departamentoName: result.getText({ name: "custrecord_fb_departamento_approve" })
                    });
                    return true;
                });
                log.audit({ title: 'arrApprove', details: arrApprove });
                return arrApprove
            } catch (e) {
                log.error({ title: 'Error getAprobadores:', details: e });
                return []
            }
        }
        function generaGruposAprobacion(arrAprobadores1, registro) {
            try {
                log.audit({ title: 'registro', details: registro });
                log.audit({ title: 'Arreglo original:', details: arrAprobadores1 });
                var arrAprobadores = [];
                arrAprobadores1.forEach(approve => {
                    if (!arrAprobadores.some(app => app.empleado === approve.empleado)) {
                        arrAprobadores.push(approve);
                    }
                })
                log.audit({ title: 'Arreglo filtrado:', details: arrAprobadores });
                let trandID = registro.trandID;
                let idTransaccion = registro.id;
                let recordTypeTransaccion = registro.type;
                log.audit({ title: 'Datos transaccion:', details: { idTransaccion, trandID } });
                let verificaListaAprobaciones = obtenListaAprobaciones(arrAprobadores.length)
                log.audit({ title: 'verificaListaAprobaciones', details: verificaListaAprobaciones });
                // Se genera el grupo de aprobación
                if (verificaListaAprobaciones) {
                    let grupoAprobacion = record.create({ type: "customrecord_fb_group_approver_rd", isDynamic: true })
                    grupoAprobacion.setValue({ fieldId: 'name', value: ('Grupo de multicentros - ' + trandID) });
                    grupoAprobacion.setValue({ fieldId: 'custrecord_fb_detail_approver', value: ('Grupo de aprobación enfocado para las SolPed de diferentes departamentos, creado para la transacción ' + trandID) });
                    var grupoId = grupoAprobacion.save({ enableSourcing: true, ignoreMandatoryFields: true });
                    log.audit({ title: 'grupoAprobacion', details: grupoAprobacion });

                    //Se generan los aprobadores para el grupo de aprobación
                    arrAprobadores.forEach((approver, index) => {
                        let numApp = (index + 1);
                        log.audit({ title: 'Datos:', details: { approver: approver, index: numApp } });
                        let aprobadorPib = record.create({ type: "customrecord_fb_entity_approver", isDynamic: true })
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_posicion_approve', value: numApp });
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_id_group_approver', value: grupoId });
                        let arrAppPib = arrAprobadores1.filter(app => app.empleado === approver.empleado);
                        log.audit({ title: 'arrAppPib', details: arrAppPib });
                        let nameDep = '';
                        arrAppPib.forEach((app, index) => {
                            if (arrAppPib.length - 1 === index) {
                                nameDep += app.departamentoName
                            } else {
                                nameDep += app.departamentoName + ' - '
                            }
                        })
                        log.audit({ title: 'nameDep', details: nameDep });
                        aprobadorPib.setValue({ fieldId: 'name', value: (`Aprobador ${numApp} - (${nameDep})`) });
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_employee_approve', value: approver.empleado });
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_departamento_approve', value: approver.departamento });
                        var aprobadorId = aprobadorPib.save({ enableSourcing: true, ignoreMandatoryFields: true });
                    })

                    record.submitFields({
                        type: recordTypeTransaccion,
                        id: idTransaccion,
                        values: {
                            custbody_fb_group_approver_into_body: grupoId,
                            custbody_fb_aprobador_original: arrAprobadores[0].empleado,
                            custbody_fb_posicion_aprobadora: 1,
                            nextapprover: (arrAprobadores.length > 1 ? arrAprobadores[1].empleado : '')
                        }
                    });
                    return 'CREATE_GROUP_SUCCESS'

                } else {
                    return 'NOT_SUFICIENT_APPROVER'
                }

            } catch (e) {
                log.error({ title: 'Error generaGruposAprobacion:', details: e });
                return 'ERROR_CREATE_GROUP'

            }
        }
        function obtenListaAprobaciones(longitud) {
            try {
                var customlist_fb_list_posicion_approveSearchObj = search.create({
                    type: "customlist_fb_list_posicion_approve",
                    filters:
                        [
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" })
                        ]
                });
                var searchResultCount = customlist_fb_list_posicion_approveSearchObj.runPaged().count;
                log.debug("customlist_fb_list_posicion_approveSearchObj result count", searchResultCount);
                let countInt = 0;
                let countFind = 0;
                customlist_fb_list_posicion_approveSearchObj.run().each(function (result) {
                    countInt++;
                    log.audit({ title: 'countInt === result.id', details: result.id });
                    if (countInt === parseInt(result.id)) {
                        countFind++;
                    }
                    // .run().each has a limit of 4,000 results
                    return true;
                });

                /*
                    customlist_fb_list_posicion_approveSearchObj.id="customsearch1694621263453";
                    customlist_fb_list_posicion_approveSearchObj.title="Lista de orden de aprobación Search (copy)";
                    var newSearchId = customlist_fb_list_posicion_approveSearchObj.save();
                */
                log.audit({ title: 'Datos:', details: { longitud, countFind } });
                return (countFind >= longitud ? true : false)
            } catch (e) {
                log.error({ title: 'Error obtenListaAprobaciones:', details: e });
                return false
            }
        }
        function getBudget(currRd, departamento, clase, cuenta, periodo, subsidiaria) {
            try {
                var budget = {
                    amount: 0,
                    amount_consumido: 0,
                    amount_restante: 0,
                    id: '',
                    status: 0
                };

                let filtros = [
                    ["mainline", "is", "F"],
                    "AND",
                    ["custbody_bm_budget_current", "is", "T"],
                    "AND",
                    ["type", "anyof", "Custom107"],
                    "AND",
                    ["status", "anyof", "Custom107:E"],
                    "AND",
                    ["account", "anyof", cuenta],
                    "AND",
                    ["department", "anyof", departamento],
                    "AND",
                    ["class", "anyof", clase],
                    "AND",
                    ["custcol_bm_line_bdg_period", "anyof", periodo],
                    "AND",
                    ["subsidiary", "anyof", subsidiaria]
                ]
                var transactionSearchObj = search.create({
                    type: "transaction",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "internalid", summary: search.Summary.GROUP, label: "Internal ID" }),
                            search.createColumn({ name: "amount", summary: search.Summary.SUM, label: "Amount" }),
                            search.createColumn({ name: "custcol_fb_pre_comprometido_monto", summary: search.Summary.SUM, label: "Precomprometido" }),
                        ]
                });
                transactionSearchObj.id = 'customsearch_fb_search_test_script';
                transactionSearchObj.title = 'FB -Test search by script';
                // transactionSearchObj.save();
                var searchResultCount = transactionSearchObj.runPaged().count;
                log.debug({ title: "transactionSearchObj result count", detail: searchResultCount });
                transactionSearchObj.run().getRange({ start: 0, end: 1 }).forEach(function (result) {
                    if (searchResultCount === 1) {
                        budget.amount = parseFloat(result.getValue({ name: "amount", summary: search.Summary.SUM }));
                        budget.amountPre = parseFloat(result.getValue({ name: "custcol_fb_pre_comprometido_monto", summary: search.Summary.SUM })) || 0;
                        budget.id = result.getValue({ name: "internalid", summary: search.Summary.GROUP });
                        budget.status = 0
                    } else {
                        budget.amount = 0;
                        budget.amountPre = 0;
                        budget.id = 0;
                        budget.status = -2;
                    }
                    log.debug({ title: 'budget', details: budget });
                })
                return budget;
            } catch (e) {
                log.error({ title: 'Error getBudget:', details: e });
                return 0;
            }
        }
        function getBudgetConsumed(tipo, departamento, clase, cuenta, periodo, subsidiaria) {
            try {
                var budgetConsumed = 0;
                var transactionSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["formulatext: {status}", "doesnotcontain", "reject"],
                            "AND",
                            ["accounttype", "anyof", "COGS", "Expense", "OthExpense", "DeferExpense"],
                            "AND",
                            ["account.custrecord_bm_budgetaccount", "is", "F"],
                            "AND",
                            ["status", "noneof", "PurchOrd:A", "PurchOrd:G", "PurchOrd:H", "PurchOrd:P", "PurchReq:C", "PurchReq:H", "PurchReq:E", "PurchReq:G", "PurchReq:D", "PurchReq:F", "PurchReq:R"],
                            "AND",
                            ["account", "anyof", cuenta],
                            "AND",
                            ["department", "anyof", departamento],
                            "AND",
                            ["class", "anyof", clase],
                            "AND",
                            ["subsidiary", "anyof", subsidiaria],
                            "AND",
                            ["custcol_fb_periodo_sublist", "anyof", periodo],
                            // "AND",
                            // ["type", "anyof", tipo]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "formulacurrency",
                                summary: "SUM",
                                formula: "SUM(NVL(CASE WHEN {posting} = 'T' THEN {amount} END,0)) + (SUM(NVL(CASE WHEN {recordType}='purchaseorder' THEN {amount} END,0))  - SUM(NVL(CASE WHEN {recordType} ='vendorbill' AND {createdfrom} IS NOT NULL AND {createdfrom.status} NOT IN ('Closed','Fully Billed','Totalmente facturado') THEN {amount} END,0)) + SUM(NVL(CASE WHEN {recordType} ='vendorbill' AND {posting} ='F' AND {createdfrom} IS NOT NULL THEN {amount} END,0))) + SUM(NVL(CASE WHEN {recordType} ='purchaserequisition'  THEN {amount} END,0))",
                                label: "Formula (Currency)"
                            })
                        ]
                });

                transactionSearchObj.id = 'customsearch_fb_search_test_consumed';
                transactionSearchObj.title = 'FB -Test search by script consumed';
                // transactionSearchObj.save();
                var searchResultCount = transactionSearchObj.runPaged().count;
                log.debug("transactionSearchObj result count", searchResultCount);
                transactionSearchObj.run().each(function (result) {
                    // .run().each has a limit of 4,000 results
                    log.debug({ title: 'result', details: result });
                    let budgetCAux = result.getValue({ name: 'formulacurrency', summary: 'SUM' })
                    budgetConsumed = ((budgetCAux === '' || budgetCAux === null) ? 0 : parseFloat(budgetCAux));
                    log.debug({ title: 'budgetConsumed', details: budgetConsumed });
                    return true;
                });

                return budgetConsumed;
            } catch (e) {
                log.error({ title: 'Error getBudgetConsumed', details: e });
                return false;
            }
        }
        return { onRequest }

    });
