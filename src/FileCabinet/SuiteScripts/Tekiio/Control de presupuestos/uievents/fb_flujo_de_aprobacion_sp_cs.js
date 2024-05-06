/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/search", "N/ui/message", "N/record", "N/email", "N/runtime", "N/url", "N/https"],

    function (search, message, record, email, runtime, url, https) {

        const DATA_SL_SERVICE = {};
        DATA_SL_SERVICE.SCRIPID = 'customscript_fb_suitelet_service_consult';
        DATA_SL_SERVICE.DEPLOYID = 'customdeploy_fb_suitelet_service_consult'
        var validacionAprueba = true;
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            try {
            } catch (e) {
                console.error({ title: 'Error pageInit:', details: e });
            }
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {

            } catch (e) {
                console.log({ title: 'Error fieldChanged:', details: e });
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

        }

        function solicitaAprobacion(idRecord, total, idGrupoAprobacion, aprobadorActual, typeTrandActual, condicion) {
            try {
                if (validacionAprueba) {
                    validacionAprueba = false
                    // Iniciando con las validaciones previo a la aprobacion de la transaccion
                    let objMessage = {}
                    console.log({ title: 'total', details: total });
                    console.log({ title: 'typeof aprobadorActual', details: typeof aprobadorActual });
                    // typeTrandActual = (typeTrandActual === 'purchreq' ? record.Type.PURCHASE_REQUISITION :record.Type.PURCHASE_ORDER)
                    console.log({ title: 'solicitaAprobacion', details: { aprobadorActual, idGrupoAprobacion, condicion, typeTrandActual } });
                    //Obtiene la lista de aprobadores y ordena por posicion
                    // let aprobadorOrd = getAprobadores(idGrupoAprobacion);
                    var url_service_sl = url.resolveScript({
                        scriptId: DATA_SL_SERVICE.SCRIPID,
                        deploymentId: DATA_SL_SERVICE.DEPLOYID,
                        returnExternalUrl: false
                    });
                    let bodyAux = {
                        operador: 'search_arr_approval_group',
                        idGrupoAprobacion: idGrupoAprobacion
                    }
                    // Busca todos los aprobadores
                    var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                    console.log({ title: 'response', details: response });
                    let aprobadorOrd = JSON.parse(response.body).arrApprove;
                    console.log({ title: 'aprobadorOrd', details: aprobadorOrd });
                    let arrApprove = aprobadorOrd.sort(comparaPrioridad);
                    console.log({ title: 'arrApprove', details: arrApprove });

                    // Valida si hay aprobadores con la suficiente cantidad para aprobar
                    let montoMasAlto = arrApprove.find(approver => parseFloat(approver.monto) >= total) || null;
                    console.log({ title: 'montoMasAlto', details: montoMasAlto });
                    if (montoMasAlto) {

                        // Valida si el aprobador actual posee la cantidad suficiente por aprobar
                        // let aprobador = arrApprove.find(approver => (approver.empleado === aprobadorActual.id && approver.posicion === aprobadorActual.posicion)) || null;
                        let aprobador = null;
                        let pos = 0;
                        for (let iterator = 0; iterator < arrApprove.length; iterator++) {
                            let approver = arrApprove[iterator];
                            if (parseInt(approver.empleado) === parseInt(aprobadorActual.id) && parseInt(approver.posicion) === parseInt(aprobadorActual.posicion)) {
                                aprobador = approver;
                                pos = iterator;
                            }
                        }

                        console.log({ title: 'aprobador', details: aprobador });
                        // Busca el aprobador dentro de la lista de aprobadores con base a su posicion de aprobacion y empleado asociado
                        if (aprobador) {
                            objMessage.approver = aprobador;

                            // Valida si se llego al final del grupo de aprobación
                            let condicionAprobatoria = ((total <= aprobador.monto && total > 0) ? true : false)
                            if (condicionAprobatoria) {

                                // Se actualiza las lineas que contengan el el departamento con el aprobador actual
                                bodyAux = {};
                                bodyAux = {
                                    operador: 'update_line_transaction',
                                    objUpdateLine: { idRecord, typeTrandActual, condicion, aprobador }
                                };
                                // Busca todos los aprobadores
                                var response = JSON.parse(https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) }).body)
                                let statusUpdateTransaction = response.status || null
                                console.log({ title: 'Status update', details: response });
                                // Si es aprobar la transaccion y despues de que se haya aprobado a nivel linea, se coloca el estado de la transaccion como cancelado
                                // Ademas que se actualiza los budgets utilizados 
                                if (condicion && statusUpdateTransaction) {
                                    let statusUpdateBudget = updateBudget(idRecord, typeTrandActual);
                                    if (statusUpdateBudget) {
                                        bodyAux = {
                                            operador: 'submit_fields_to_record',
                                            objSubmit: {
                                                type: typeTrandActual,
                                                id: idRecord,
                                                values: {
                                                    nextapprover: '',
                                                    approvalstatus: 2
                                                }
                                            }
                                        }
                                        var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                        console.log({ title: 'Se actualizo la transaccion', details: response });
                                    } else {
                                        statusUpdateTransaction = false
                                    }
                                }

                                // Si es rechazada la transaccion y despues de que se haya rechazado a nivel linea, se coloca el estado de la transaccion como cancelado
                                if (!condicion && statusUpdateTransaction) {
                                    bodyAux = {
                                        operador: 'submit_fields_to_record',
                                        objSubmit: {
                                            type: typeTrandActual,
                                            id: idRecord,
                                            values: {
                                                nextapprover: '',
                                                approvalstatus: 3
                                            }
                                        }
                                    }
                                    var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                    console.log({ title: 'Se actualizo la transaccion', details: response });
                                }
                                objMessage.options = ((statusUpdateTransaction) ? ((condicion) ? 'APPROVED' : 'CANCEL') : 'ERROR_UPDATE_LINES')
                            } else {

                                // En caso de que la aproacion no llegue a su aprobador final, debera pasar con el siguiente
                                switch (pos) {
                                    case (arrApprove.length - 2):
                                        let posNext1 = pos + 1;
                                        let origApprove1 = arrApprove[posNext1];
                                        let value = {
                                            nextapprover: '',
                                            custbody_fb_aprobador_original: origApprove1.empleado,
                                            custbody_fb_posicion_aprobadora: origApprove1.posicion,
                                        }
                                        if (!condicion) {
                                            values.approvalstatus = 3
                                        }
                                        bodyAux = {
                                            operador: 'submit_fields_to_record',
                                            objSubmit: {
                                                type: typeTrandActual,
                                                id: idRecord,
                                                values: value
                                            }
                                        }
                                        var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                        console.log({ title: 'Se actualizo la transaccion, ultima vuelta de aprobacion', details: response });

                                        objMessage.options = (condicion ? 'PRE_APPROVED' : 'PRE_CANCEL')

                                        // Enviando mensaje para el siguiente aprobador
                                        objMessage.idTrand = idRecord;
                                        objMessage.typeTrand = typeTrandActual;
                                        objMessage.id = origApprove1.empleado;

                                        // Se envia mensaje al siguiente aprobador para que continue con la linea para la aprobacion pertinente
                                        if (condicion) {
                                            //sentEmail(objMessage);
                                        }
                                        break;
                                    default:
                                        try {
                                            let posOri = pos + 1;
                                            let posNext = pos + 2;
                                            let origApprove = arrApprove[posOri];
                                            let nextApprove = arrApprove[posNext];
                                            let values2 = {
                                                nextapprover: nextApprove.empleado,
                                                custbody_fb_aprobador_original: origApprove.empleado,
                                                custbody_fb_posicion_aprobadora: origApprove.posicion,
                                            }
                                            if (!condicion) {
                                                values2.approvalstatus = 3
                                            }
                                            bodyAux = {
                                                operador: 'submit_fields_to_record',
                                                objSubmit: {
                                                    type: typeTrandActual,
                                                    id: idRecord,
                                                    values: values2
                                                }
                                            }
                                            var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                            console.log({ title: 'Se actualizo la transaccion', details: response });
                                            objMessage.options = (condicion ? 'PRE_APPROVED' : 'PRE_CANCEL')

                                            //Enviando mensaje para el siguiente aprobador
                                            objMessage.idTrand = idRecord;
                                            objMessage.typeTrand = typeTrandActual;
                                            objMessage.id = origApprove.empleado;

                                            // Se envia mensaje al siguiente aprobador para que continue con la linea para la aprobacion pertinente
                                            if (condicion) {
                                                //sentEmail(objMessage);
                                            }
                                        } catch (e) {
                                            console.error({ title: 'Error validation new Approve', details: e });
                                        }
                                        break;
                                }
                            }
                            // Se crea la alerta para la aprobacion
                            createAlert(objMessage);
                            if (objMessage.options !== 'ERROR_UPDATE_LINES') {
                                bodyAux = {};
                                bodyAux = {
                                    operador: 'tracking_approval_status',
                                    objApproval: {
                                        idRecord: idRecord,
                                        aprobadorActualId: aprobadorActual.id,
                                        aprobadorId: aprobador.id,
                                        condicion: condicion
                                    }
                                }
                                // Busca todos los aprobadores
                                console.log({ title: 'response', details: response });
                                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                location.reload()
                            }


                        } else {
                            objMessage.options = 'NOT_MATCH_APP_POS';
                            createAlert(objMessage);
                        }
                    } else {
                        objMessage.options = 'NO_AMOUNT_SUF';
                        createAlert(objMessage);
                    }
                }
            } catch (e) {
                console.error({ title: 'Error solicitaAprobacion:', details: e });
                let objMessage = {};
                objMessage.options = 'ERROR_SCRIPT';
                objMessage.error = e.message
                createAlert(objMessage);
            }
        }
        function solicitaAprobacionMultiCentro(idRecord, total, idGrupoAprobacion, aprobadorActual, typeTrandActual, condicion) {
            try {

                if (validacionAprueba) {
                    validacionAprueba = false
                    // Iniciando con las validaciones previo a la aprobacion de la transaccion
                    let objMessage = {}
                    console.log({ title: 'total', details: total });
                    console.log({ title: 'typeof aprobadorActual', details: typeof aprobadorActual });
                    // typeTrandActual = (typeTrandActual === 'purchreq' ? record.Type.PURCHASE_REQUISITION :record.Type.PURCHASE_ORDER)
                    console.log({ title: 'solicitaAprobacion', details: { aprobadorActual, idGrupoAprobacion, condicion, typeTrandActual } });
                    //Obtiene la lista de aprobadores y ordena por posicion
                    // let aprobadorOrd = getAprobadores(idGrupoAprobacion);
                    var url_service_sl = url.resolveScript({
                        scriptId: DATA_SL_SERVICE.SCRIPID,
                        deploymentId: DATA_SL_SERVICE.DEPLOYID,
                        returnExternalUrl: false
                    });
                    let bodyAux = {
                        operador: 'search_arr_approval_group',
                        idGrupoAprobacion: idGrupoAprobacion
                    }
                    var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                    console.log({ title: 'response', details: response });
                    let aprobadorOrd = JSON.parse(response.body).arrApprove;
                    let arrApprove = aprobadorOrd.sort(comparaPrioridad);
                    console.log({ title: 'arrApprove', details: arrApprove });


                    // Valida si el aprobador actual posee la cantidad suficiente por aprobar
                    // let aprobador = arrApprove.find(approver => (approver.empleado === aprobadorActual.id && approver.posicion === aprobadorActual.posicion)) || null;
                    let aprobador = null;
                    let pos = 0;
                    for (let iterator = 0; iterator < arrApprove.length; iterator++) {
                        let approver = arrApprove[iterator];
                        // if (approver.empleado === aprobadorActual.id && approver.posicion === aprobadorActual.posicion) {
                        if (parseInt(approver.empleado) === parseInt(aprobadorActual.id) && parseInt(approver.posicion) === parseInt(aprobadorActual.posicion)) {
                            aprobador = approver;
                            pos = iterator;
                        }
                    }

                    console.log({ title: 'aprobador', details: aprobador });
                    // Busca el aprobador dentro de la lista de aprobadores con base a su posicion de aprobacion y empleado asociado
                    if (aprobador) {
                        objMessage.approver = aprobador;
                        // Se actualiza las lineas que contengan el el departamento con el aprobador actual
                        bodyAux = {};
                        bodyAux = {
                            operador: 'update_line_transaction',
                            objUpdateLine: { idRecord, typeTrandActual, condicion, aprobador }
                        };
                        // Busca todos los aprobadores
                        var response = JSON.parse(https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) }).body)
                        let statusUpdateTransaction = response.status || null
                        console.log({ title: 'Status update', details: response });
                        switch (pos) {
                            case (arrApprove.length - 1):
                                var values = {
                                    approvalstatus: (condicion ? 2 : 3)
                                }
                                if (!condicion) {
                                    values.approvalstatus = 3
                                }
                                bodyAux = {
                                    operador: 'submit_fields_to_record',
                                    objSubmit: {
                                        type: typeTrandActual,
                                        id: idRecord,
                                        values: values
                                    }
                                }
                                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                break;

                            case (arrApprove.length - 2):
                                var posNext1 = pos + 1;
                                var origApprove1 = arrApprove[posNext1];
                                console.log({ title: 'origApprove1', details: origApprove1 });
                                var values = {
                                    nextapprover: '',
                                    custbody_fb_aprobador_original: origApprove1.empleado,
                                    custbody_fb_posicion_aprobadora: origApprove1.posicion,
                                }
                                if (!condicion) {
                                    values.approvalstatus = 3
                                }
                                bodyAux = {
                                    operador: 'submit_fields_to_record',
                                    objSubmit: {
                                        type: typeTrandActual,
                                        id: idRecord,
                                        values: values
                                    }
                                }
                                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                objMessage.options = (condicion ? 'PRE_APPROVED' : 'PRE_CANCEL')

                                // Enviando mensaje para el siguiente aprobador
                                objMessage.idTrand = idRecord;
                                objMessage.typeTrand = typeTrandActual;
                                objMessage.id = origApprove1.empleado;

                                // Se envia mensaje al siguiente aprobador para que continue con la linea para la aprobacion pertinente
                                if (condicion) {
                                    //sentEmail(objMessage);
                                }
                                break;
                            default:
                                try {
                                    let posOri = pos + 1;
                                    let posNext = pos + 2;
                                    let origApprove = arrApprove[posOri];
                                    let nextApprove = arrApprove[posNext];
                                    console.log({ title: 'origApprove', details: origApprove });
                                    console.log({ title: 'nextApprove', details: nextApprove });
                                    let values2 = {
                                        nextapprover: nextApprove.empleado,
                                        custbody_fb_aprobador_original: origApprove.empleado,
                                        custbody_fb_posicion_aprobadora: origApprove.posicion,
                                    }
                                    if (!condicion) {
                                        values2.approvalstatus = 3
                                    }
                                    bodyAux = {
                                        operador: 'submit_fields_to_record',
                                        objSubmit: {
                                            type: typeTrandActual,
                                            id: idRecord,
                                            values: values2
                                        }
                                    }
                                    var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                    objMessage.options = (condicion ? 'PRE_APPROVED' : 'PRE_CANCEL')

                                    //Enviando mensaje para el siguiente aprobador
                                    objMessage.idTrand = idRecord;
                                    objMessage.typeTrand = typeTrandActual;
                                    objMessage.id = origApprove.empleado;

                                    // Se envia mensaje al siguiente aprobador para que continue con la linea para la aprobacion pertinente
                                    if (condicion) {
                                        //sentEmail(objMessage);
                                    }
                                } catch (e) {
                                    console.error({ title: 'Error validation new Approve', details: e });
                                }
                                break;
                        }
                        // Si es aprobar la transaccion y despues de que se haya aprobado a nivel linea, se coloca el estado de la transaccion como cancelado
                        // Ademas que se actualiza los budgets utilizados 
                        if (condicion && statusUpdateTransaction && pos === (arrApprove.length - 1)) {
                            let statusUpdateBudget = updateBudget(idRecord, typeTrandActual);
                            if (statusUpdateBudget) {
                                bodyAux = {
                                    operador: 'submit_fields_to_record',
                                    objSubmit: {
                                        type: typeTrandActual,
                                        id: idRecord,
                                        values: {
                                            nextapprover: '',
                                            approvalstatus: 2
                                        }
                                    }
                                }
                                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                            } else {
                                statusUpdateTransaction = false
                            }
                        }

                        // Si es rechazada la transaccion y despues de que se haya rechazado a nivel linea, se coloca el estado de la transaccion como cancelado
                        if (!condicion && statusUpdateTransaction) {
                            bodyAux = {
                                operador: 'submit_fields_to_record',
                                objSubmit: {
                                    type: typeTrandActual,
                                    id: idRecord,
                                    values: {
                                        nextapprover: '',
                                        approvalstatus: 3
                                    }
                                }
                            }
                            var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                        }
                        objMessage.options = ((statusUpdateTransaction) ? ((condicion) ? 'APPROVED' : 'CANCEL') : 'ERROR_UPDATE_LINES')

                        // Se crea la alerta para la aprobacion
                        createAlert(objMessage);

                        if (objMessage.options !== 'ERROR_UPDATE_LINES') {
                            bodyAux = {};
                            bodyAux = {
                                operador: 'tracking_approval_status',
                                objApproval: {
                                    idRecord: idRecord,
                                    aprobadorActualId: aprobadorActual.id,
                                    aprobadorId: aprobador.id,
                                    condicion: condicion
                                }
                            }
                            // Busca todos los aprobadores
                            console.log({ title: 'response', details: response });
                            var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                            location.reload()
                        }


                    } else {
                        objMessage.options = 'NOT_MATCH_APP_POS';
                        createAlert(objMessage);
                    }
                }
            } catch (e) {
                console.error({ title: 'Error solicitaAprobacionMultiCentro:', details: e });
                let objMessage = {};
                objMessage.options = 'ERROR_SCRIPT';
                objMessage.error = e.message
                createAlert(objMessage);
            }
        }
        function updateBudget(idRecord, typeTrandActual) {
            try {
                var scriptObj = runtime.getCurrentScript();
                console.log('Remaining governance units: ' + scriptObj.getRemainingUsage());
                let transactionPib = record.load({ type: typeTrandActual, id: idRecord, isDynamic: true });
                let noLines = transactionPib.getLineCount({ sublistId: 'item' });


                // Obtiene y agrupa todos los budgets a nivel linea para ser modificados
                console.log({ title: 'noLines', details: noLines });
                let arrObj = [];
                for (let index = 0; index < noLines; index++) {
                    let objAux = {};

                    objAux.ctrl_ppto = transactionPib.getSublistText({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', line: index });
                    objAux.ctrl_ppto_id = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', line: index });

                    objAux.clase = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'class', line: index });
                    objAux.departamento = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'department', line: index });

                    objAux.account = transactionPib.getSublistText({ sublistId: 'item', fieldId: 'custcol_bm_itemaccount', line: index });
                    objAux.account_id = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'custcol_bm_itemaccount', line: index });

                    objAux.periodo = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_periodo_sublist', line: index });

                    objAux.amount_in_line = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', line: index });

                    objAux.amount = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: index });

                    arrObj.push(objAux);
                }

                // Se agrupa el arreglo con base a los budgets utilizados
                let arrGrouped = arrObj.reduce((acc, line) => {
                    // Se establece el id del budget para generar una busqueda en base a ellos
                    const key = line.ctrl_ppto_id;
                    if (!acc[key]) {
                        acc[key] = []
                    }
                    acc[key].push(line);
                    return acc;
                }, {});
                console.log({ title: 'Budgets agrupados:', details: arrGrouped });
                let arrIdBudgets = Object.keys(arrGrouped);
                var url_service_sl = url.resolveScript({
                    scriptId: DATA_SL_SERVICE.SCRIPID,
                    deploymentId: DATA_SL_SERVICE.DEPLOYID,
                    returnExternalUrl: false
                });
                let bodyAux = {};
                bodyAux = {
                    operador: 'search_info_budget',
                    arrIdBudgets: arrIdBudgets
                }
                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                console.log({ title: 'Obtiene la info del budget', details: response });
                let dataBudget = JSON.parse(response.body).dataBudget;

                console.log({ title: 'info', details: dataBudget });

                // Asignacion de la linea del budget a la linea de la transaccion relacionada, tambien aumenta el numero de lineas para validacion si estan todas las que se desean aprobar o no
                let arrPib, lineaPibote, countLineFound = 0;
                for (idBudget in arrGrouped) {
                    arrPib = arrGrouped[idBudget];
                    arrPib.map((linePib) => {
                        lineaPibote = dataBudget.find((lineaAux) => (lineaAux.idBudget === linePib.ctrl_ppto_id && lineaAux.department === linePib.departamento && lineaAux.period === linePib.periodo && lineaAux.class === linePib.clase && lineaAux.account === linePib.account_id)) || null;
                        if (lineaPibote) {
                            linePib.line = parseInt(lineaPibote.line) - 1;
                            countLineFound++;
                        }
                    })
                }
                console.log({ title: 'Objeto listo para actualizar:', details: arrGrouped });
                if (countLineFound === noLines) {
                    //Validacion si existe el mismo numero de lineas encontradas en el budget que las que estan dentro de la transacción
                    bodyAux = {};
                    bodyAux = {
                        operador: 'update_budget_transaction',
                        arrGrouped: arrGrouped
                    }
                    var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                    let condicion = JSON.parse(response.body).condicionUpdateBudget
                    console.log({ title: 'Se actualizo correctamente el budget:', details: condicion });
                    return condicion;
                }
                console.log('Remaining governance units: ' + scriptObj.getRemainingUsage());
                return false;
            } catch (e) {
                console.error({ title: 'Error updateBudget:', details: e });
                return false;
            }
        }
        function sentEmail(objAux) {
            try {
                var url_service_sl = url.resolveScript({
                    scriptId: DATA_SL_SERVICE.SCRIPID,
                    deploymentId: DATA_SL_SERVICE.DEPLOYID,
                    returnExternalUrl: false
                });
                let bodyAux = {
                    operador: 'sent_email_to_approver',
                    objAux: objAux
                }
                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                console.log({ title: 'response', details: response });
            } catch (e) {
                console.error({ title: 'Error sentEmail:', details: e });
            }
        }
        function comparaPrioridad(a, b) {
            return parseFloat(a.posicion) - parseFloat(b.posicion);
        }
        function createGroupApprover(idRecord, recordType) {
            try {

                let transactionPib = record.load({ type: recordType, id: idRecord, isDynamic: true });
                console.log({ title: 'transactionPib', details: transactionPib });
                obtenAprobadores(transactionPib)
            } catch (e) {
                console.error({ title: 'Error createGroupApprover:', details: e });
            }
        }
        function obtenAprobadores(transactionPib) {
            try {
                let countLines = transactionPib.getLineCount({ sublistId: 'item' });
                let objDept = {};
                let obj = {}
                for (let index = 0; index < countLines; index++) {
                    let idDep = transactionPib.getSublistValue({ sublistId: 'item', fieldId: 'department', line: index });
                    if (!objDept[idDep]) {
                        objDept[idDep] = {}
                    }
                }
                let arrDept = Object.keys(objDept);
                let arrIdGroupApproved = [];
                console.log({ title: 'arrDept', details: arrDept });


                var url_service_sl = url.resolveScript({
                    scriptId: DATA_SL_SERVICE.SCRIPID,
                    deploymentId: DATA_SL_SERVICE.DEPLOYID,
                    returnExternalUrl: false
                });
                let bodyAux = {
                    operador: 'search_id_group_approver',
                    idDepartamentos: arrDept
                }
                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                let objRespuesta = JSON.parse(response.body);
                console.log({ title: 'objRespuesta', details: objRespuesta });
                // Obteniendo los ids de los grupos de aprobación
                arrIdGroupApproved = objRespuesta.arrIdGroupApproved;
                bodyAux = {
                    operador: 'search_arr_approval_group',
                    idGrupoAprobacion: arrIdGroupApproved
                }
                console.log({ title: 'response', details: response });
                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                let arrApprove = JSON.parse(response.body).arrApprove;
                let dataAprobadoresAux = (arrIdGroupApproved.length > 0 ? arrApprove : []);
                let dataAprobadores = obtenAprobadoresGenerales(dataAprobadoresAux);
                console.log({ title: 'dataAprobadores', details: dataAprobadores });
                if (dataAprobadores.length > 0) {
                    // Verifica si existe el mismo numero de departamentos que de representantes de departamento
                    if (dataAprobadores.length === arrIdGroupApproved.length) {
                        obj.options = 'WAIT_MOMENT'

                        createAlert(obj)
                        var url_service_sl = url.resolveScript({
                            scriptId: DATA_SL_SERVICE.SCRIPID,
                            deploymentId: DATA_SL_SERVICE.DEPLOYID,
                            returnExternalUrl: false
                        });
                        let bodyAux = {
                            operador: 'generate_group_approval',
                            obj_generador: {
                                trand: {
                                    id: transactionPib.id,
                                    trandID: transactionPib.getValue({ fieldId: 'tranid' }),
                                    type: transactionPib.type
                                },
                                dataAprobadores: dataAprobadores
                            }
                        }
                        var response = https.post.promise({ url: url_service_sl, body: JSON.stringify(bodyAux) }).then(function (response) {
                            console.log({ title: 'response.body', details: response.body });
                            obj.options = JSON.parse(response.body).condicion
                            createAlert(obj)
                            if (obj.options === 'CREATE_GROUP_SUCCESS') {
                                setTimeout(() => {
                                    location.reload()
                                }, 500);
                            }
                        }).catch(function onRejected(reason) {
                            console.log({ title: 'Invalid Request: ', details: reason });
                            // Generacion de mensaje de error al contacto con el suitelet de servicio
                            obj.options = 'ERROR_SCRIPT_CREATED_GROUP'
                            createAlert(obj)
                        });
                    } else {
                        obj.options = 'NOT_APROBADORES';
                        createAlert(obj);
                    }
                } else {
                    obj.options = (arrIdGroupApproved.length === 0 ? 'NOT_GROUP' : 'NOT_APROBADORES');
                    createAlert(obj);
                }
            } catch (e) {
                console.error({ title: 'Error obtenAprobadores:', details: e });
                obj.options = 'ERROR_SCRIPT_CREATED_GROUP'
                createAlert(obj)
            }
        }
        function obtenAprobadoresGenerales(dataAprobadoresAux) {
            try {
                let arrGrouped = dataAprobadoresAux.reduce((acc, line) => {
                    // Se establece el id del departamento para agruparlos de acuerdo a este
                    const key = line.departamento;
                    if (!acc[key]) {
                        acc[key] = []
                    }
                    acc[key].push(line);
                    return acc;
                }, {});
                console.log({ title: 'arrGrouped', details: arrGrouped });
                let arrMasAlto = [];
                // Se hace un recorrido buscando al aprobador con el mas alto monto
                ///
                for (dep in arrGrouped) {
                    console.log({ title: 'No. aprobadores del departamento: ' + dep, details: arrGrouped[dep].length });
                    let penultimoNo = (arrGrouped[dep].length === 1 ? arrGrouped[dep].length - 1 : arrGrouped[dep].length - 2);

                    // TODO penultimo aprobador
                    let aprobadorPib = arrGrouped[dep][penultimoNo];
                    console.log({ title: 'aprobadorPib' + dep, details: aprobadorPib });
                    // if (!arrMasAlto.some(obj=>obj.empleado ===aprobadorPib.empleado)) {
                    //     arrMasAlto.push(aprobadorPib);
                    // }
                    arrMasAlto.push(aprobadorPib);
                }
                console.log({ title: 'Representante de departamentos: ', details: arrMasAlto });

                return arrMasAlto;
            } catch (e) {
                console.error({ title: 'Error obtenAprobadoresGenerales', details: e });
                return [];
            }
        }

        function createAlert(obj) {
            try {
                let objMsg = { type: '', title: " ", message: " " }
                console.log({ title: 'Objeto para la creacion del mensaje:', details: obj });
                switch (obj.options) {
                    case "APPROVED":
                        objMsg.type = message.Type.CONFIRMATION
                        objMsg.title = "Transacción aprobada"
                        objMsg.message = "La transaccion ha sido aprobada"
                        break;
                    case "PRE_APPROVED":
                        objMsg.type = message.Type.CONFIRMATION
                        objMsg.title = "Transacción aprobada por <b>" + obj.approver.empleadoName + "</b>"
                        objMsg.message = "La transaccion ha sido aprobada"
                        break;
                    case "CANCEL":
                        objMsg.type = message.Type.ERROR
                        objMsg.title = "Transacción rechazada"
                        objMsg.message = "La transaccion ha sido rechazada"
                        break;
                    case "ERROR_UPDATE_LINES":
                        objMsg.type = message.Type.ERROR
                        objMsg.title = "Error al momento de actualizar las lineas de la transacción"
                        objMsg.message = "Notifique de esta incidencia a su administrador mas cercano para verificar el detalle."
                        break;
                    case "PRE_CANCEL":
                        objMsg.type = message.Type.ERROR
                        objMsg.title = "Transacción cancelada por <b>" + obj.approver.empleadoName + "</b>"
                        objMsg.message = "La transaccion ha sido cancelada"
                        break;
                    case "NO_AMOUNT_SUF_APP":
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "Monto configurado insuficiente"
                        objMsg.message = "El aprobador <b>" + obj.approver.empleadoName + "</b> no tiene permitido aprobar mas del monto configurado"
                        break;
                    case "NO_AMOUNT_SUF":
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "Departamento sin permiso para aprobar/cancelar el monto"
                        objMsg.message = "Los aprobadores no tienen permitido aprobar/cancelar la cantidad del monto "
                        break;
                    case "NOT_MATCH_APP_POS":
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "No coinciden el aprobador y la posicion de aprobacion."
                        objMsg.message = "El aprobador y la posicion configurada en el grupo de aprobacion no coinciden con la establecida en la transacción."
                        break;
                    case "NOT_APROBADORES":
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "Aprobadores insuficientes"
                        objMsg.message = "No todos los grupos de aprobacion tienen configurado al menos a un aprobador."
                        break;
                    case "NOT_GROUP":
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "No tiene aprobadores configurado"
                        objMsg.message = "Debe tener aprobadores dentro del grupo de aprobacion de los departamentos."
                        break;
                    case "NOT_SUFICIENT_APPROVER":
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "No hay suficientes listados de aprobadores"
                        objMsg.message = "Debe tener mas listados de prioridad de aprobadores."
                        break;
                    case "CREATE_GROUP_SUCCESS":
                        objMsg.type = message.Type.CONFIRMATION
                        objMsg.title = "Grupo de aprobacion generado"
                        objMsg.message = "Se ha creado el grupo de aprobacion para multicentros."
                        break;
                    case "ERROR_SCRIPT":
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "Error script."
                        objMsg.message = "Ocurrio un error con el script de Flujo de aprobación.<br/> <b>" + obj.error + "<b/>"
                        break;
                    case "ERROR_CREATE_GROUP":
                        objMsg.type = message.Type.ERROR
                        objMsg.title = "Error al momento de crear el grupo de aprobacion"
                        objMsg.message = "Contactese con el administrador mas cercano para mas detalles."
                        break;
                    case "WAIT_MOMENT":
                        objMsg.type = message.Type.INFORMATION
                        objMsg.title = "Espere un momento..."
                        objMsg.message = "Se esta validando la informacion..."
                        break;
                    case "ERROR_SCRIPT_CREATED_GROUP":
                        objMsg.type = message.Type.ERROR
                        objMsg.title = "ERROR "
                        objMsg.message = "Ocurrio un error al crear el grupo de aprobación."
                        break;
                    default:
                        objMsg.type = message.Type.WARNING
                        objMsg.title = "Mensaje no identificado"
                        objMsg.message = "Notifique esta incidencia a su administrador mas cercano"
                        break;
                }
                var mensajeExito = message.create(objMsg);
                mensajeExito.show({ duration: 550000 });
            } catch (e) {
                console.log({ title: 'Error createAlert:', details: e });
            }
        }
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            solicitaAprobacion: solicitaAprobacion,
            solicitaAprobacionMultiCentro: solicitaAprobacionMultiCentro,
            createGroupApprover: createGroupApprover
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };

    });
