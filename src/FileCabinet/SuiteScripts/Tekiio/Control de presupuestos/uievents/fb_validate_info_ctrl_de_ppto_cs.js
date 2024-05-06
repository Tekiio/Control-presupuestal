/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
/**
* @name FB - Valida info de control de ppto - CS
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Script que valida la informacion dentro de las ordenes de compra y solicitudes de pedido
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> 14/08/2023
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> Registro en Netsuite <fb_val_info_ctrl_de_ppto_cs>
*/
define(['N/search', 'N/ui/dialog', 'N/currentRecord', 'N/record', 'N/url', 'N/https', 'N/runtime'],

    function (search, dialog, currentRecord, record, url, https, runtime) {

        const DATA_SL_SERVICE = {};
        DATA_SL_SERVICE.SCRIPID = 'customscript_fb_suitelet_service_consult';
        DATA_SL_SERVICE.DEPLOYID = 'customdeploy_fb_suitelet_service_consult'
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
                console.log({ title: 'Iniciando el ClientScript ', details: 'FB - Valida info de control de ppto - CS' });
                let currRd = scriptContext.currentRecord;
                let userObj = runtime.getCurrentUser();
                console.log({ title: 'userObj', details: userObj });
                currRd.setValue({ fieldId: 'custbody_empleado_solicitud', value: userObj.id })
            } catch (e) {
                console.log({ title: 'Error pageInit:', details: e });
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
                let currRd = scriptContext.currentRecord;
                console.log({ title: 'scriptContext.fieldId', details: scriptContext.fieldId });
                console.log({ title: 'scriptContext', details: scriptContext });
                // Se obtienen y colocan los valores de los campos a nivel cabecera
                if (scriptContext.sublistId === null) {
                    // Detecta el cambio del campo y obtiene su valor al momento
                    let field = scriptContext.fieldId;
                    let value = currRd.getValue({ fieldId: field }) || '';
                    let text = currRd.getText({ fieldId: field }) || '';
                    switch (field) {
                        case 'department':
                            var url_service_sl = url.resolveScript({
                                scriptId: DATA_SL_SERVICE.SCRIPID,
                                deploymentId: DATA_SL_SERVICE.DEPLOYID,
                                returnExternalUrl: true
                            });
                            console.log({title: 'url_service_sl', details: url_service_sl});
                            let bodyAux = {
                                operador: 'search_approval_group_department',
                                idDep: value
                            }
                            var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                            let objRes = JSON.parse(response.body).idGrupoAprobacion;
                            console.log({ title: 'response.body', details: objRes });

                            console.log({ title: 'Valores:', details: { field, text, value } });
                            console.log({ title: 'Valores:', details: text });
                            console.log({ title: 'Valores:', details: field });
                            console.log({ title: 'Valores:', details: value });
                            var idGrupoAprobacion = objRes.custrecord_fb_dept_group_approve[0].value;
                            console.log({ title: 'idGrupoAprobacion', details: idGrupoAprobacion });
                            if (idGrupoAprobacion !== null && idGrupoAprobacion !== '') {
                                var url_service_sl = url.resolveScript({
                                    scriptId: DATA_SL_SERVICE.SCRIPID,
                                    deploymentId: DATA_SL_SERVICE.DEPLOYID,
                                    returnExternalUrl: true
                                });
                                let bodyAux = {
                                    operador: 'search_arr_approval_group',
                                    idGrupoAprobacion: idGrupoAprobacion
                                }
                                console.log({ title: 'response', details: response });
                                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                let arrApprove = JSON.parse(response.body).arrApprove;
                                console.log({ title: 'arrApprove', details: arrApprove });
                                let aprobadorOrd = arrApprove.sort(comparaPrioridad);
                                console.log({ title: 'aprobadorOrd', details: aprobadorOrd });
                                let noApprover = aprobadorOrd.length;
                                currRd.setValue({ fieldId: "custbody_fb_group_approver_into_body", value: idGrupoAprobacion })
                                switch (noApprover) {
                                    case 0:
                                        let obj = {
                                            status: 'NOT_EMP_IN_GROUP',
                                            departamento: text
                                        }
                                        createAlert(obj);
                                        currRd.setValue({ fieldId: "department", value: '' })
                                        break;
                                    case 1:
                                        currRd.setValue({ fieldId: "custbody_fb_aprobador_original", value: aprobadorOrd[0].empleado })
                                        currRd.setValue({ fieldId: "custbody_fb_posicion_aprobadora", value: aprobadorOrd[0].posicion })
                                        break;
                                    default:
                                        currRd.setValue({ fieldId: "custbody_fb_aprobador_original", value: aprobadorOrd[0].empleado })
                                        currRd.setValue({ fieldId: "custbody_fb_posicion_aprobadora", value: aprobadorOrd[0].posicion })
                                        currRd.setValue({ fieldId: "nextapprover", value: aprobadorOrd[1].empleado })
                                        break;
                                }
                                // let primerAprobador = arrApprove.reduce(function (objMin, objPib) {
                                //     return (objPib.posicion < objMin.posicion ? objPib : objMin)
                                // })
                                // console.log({ title: 'primerAprobador', details: primerAprobador });
                                // currRd.setValue({ fieldId: "custbody_fb_aprobador_original", value: primerAprobador.empleado })
                                /*
                                customrecord_fb_entity_approverSearchObj.id="customsearch1693407883598";
                                customrecord_fb_entity_approverSearchObj.title="FB - Obten aprobadores - SS (copy)";
                                var newSearchId = customrecord_fb_entity_approverSearchObj.save();
                                */
                            } else {
                                // Lanza mensaje que no tiene un grupo de aprobacion asignado
                                let obj = {
                                    status: 'NOT_GROUP_APP',
                                    departamento: text
                                }
                                createAlert(obj);
                                currRd.setValue({ fieldId: "department", value: '' })

                            }
                            break;
                    }
                }
                // Se obtienen y colocan los valores de los campos a nivel linea
                if (scriptContext.sublistId === 'item') {
                    // Detecta el cambio del campo y obtiene su valor al momento
                    let field = scriptContext.fieldId;
                    let value = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: field }) || '';
                    var text = currRd.getCurrentSublistText({ sublistId: 'item', fieldId: field }) || '';
                    // console.log({title: 'field', details: field});
                    switch (field) {
                        // Se obtiene la posicion presupuestal de la cuenta
                        case 'custcol_bm_itemaccount':
                            console.log({ title: 'Valores del Registro:', details: currRd });
                            console.log({ title: 'Tipo de Registro:', details: currRd.type });
                            console.log({ title: 'Valor del campo [ ' + field + ' ]', details: value });

                            // Obtiene la posicion presupuestal de la clase
                            if (value !== '') {
                                var url_service_sl = url.resolveScript({
                                    scriptId: DATA_SL_SERVICE.SCRIPID,
                                    deploymentId: DATA_SL_SERVICE.DEPLOYID,
                                    returnExternalUrl: true
                                });
                                let bodyAux = {
                                    operador: 'search_posicion_pptal',
                                    idAccount: value
                                }
                                var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                                let fieldLookUp = JSON.parse(response.body).fieldLookUp;
                                console.log({ title: 'fieldLookUp', details: fieldLookUp });
                                if (fieldLookUp.custrecord_fb_pos_presupuestal_body.length !== 0) {
                                    console.log({ title: 'Posicion presupuestal obtenida', details: fieldLookUp.custrecord_fb_pos_presupuestal_body[0] });
                                    let idPosPpto = fieldLookUp.custrecord_fb_pos_presupuestal_body[0].value;
                                    currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_pos_presupuestal_sublist', value: idPosPpto })
                                } else {
                                    let objMsg = {
                                        status: 'NOT_PP',
                                        objLine: { account: { text } }
                                    }
                                    createAlert(objMsg)
                                    currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_pos_presupuestal_sublist', value: '' })
                                    currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', value: '' })
                                }
                            }
                            break;
                        case 'item':
                            // Se establece que el control presupuestal y su posicion sera siempre vacia despues de colocar el ITEM
                            currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_pos_presupuestal_sublist', value: '' })
                            currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', value: '' })
                            break;
                        case 'custcol_bm_line_bdg_period':
                            currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_periodo_sublist', value: value })
                            break;
                    }
                }


            } catch (e) {
                console.log({ title: 'Error fieldChanged:', details: e });
            }
        }
        function comparaPrioridad(a, b) {
            return a.posicion - b.posicion;
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
            try {
                if (scriptContext.sublistId === 'item') {
                    let currRd = scriptContext.currentRecord;
                    console.log({ title: 'currRd.type', details: currRd.type });
                    console.log({ title: 'scriptContext', details: currRd.getValue('type') });
                    // Creacion de objeto para validaciones a nivel linea
                    var objLine = {
                        //Atributos base
                        subsidiary: {
                            value: '',
                            text: ''
                        },
                        amount: 0,
                        idBudget: 0,
                        department: {
                            value: '',
                            text: ''
                        },
                        class: {
                            value: '',
                            text: ''
                        },
                        period: {
                            value: '',
                            text: ''
                        },
                        account: {
                            value: '',
                            text: ''
                        },
                        // Atributos necesarios para la validacion
                        pos_ppto: {
                            value: '',
                            text: ''
                        },
                        ctrl_ppto: {
                            value: '',
                            text: ''
                        },
                    }
                    // Se obtienen los valores necesarios para realizar las validaciones pertinentes por linea
                    console.log({ title: 'Test obtain value', details: currRd.getCurrentSublistText({ sublistId: 'item', fieldId: 'department' }) });
                    objLine.account.text = currRd.getCurrentSublistText({ sublistId: 'item', fieldId: 'custcol_bm_itemaccount' }) || '';
                    objLine.account.value = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_bm_itemaccount' }) || '';

                    objLine.department.text = currRd.getCurrentSublistText({ sublistId: 'item', fieldId: 'department' }) || '';
                    objLine.department.value = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: 'department' }) || '';

                    objLine.class.text = currRd.getCurrentSublistText({ sublistId: 'item', fieldId: 'class' }) || '';
                    objLine.class.value = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: 'class' }) || '';

                    objLine.amount = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount' }) || 0;

                    objLine.ctrl_ppto.text = currRd.getCurrentSublistText({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist' }) || '';
                    objLine.ctrl_ppto.value = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist' }) || '';


                    // Se obtienen los valores de cabecera para realizar las validaciones pertienentes
                    objLine.period.text = currRd.getCurrentSublistText({ sublistId: 'item', fieldId: 'custcol_fb_periodo_sublist' }) || '';
                    objLine.period.value = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_periodo_sublist' }) || '';

                    objLine.subsidiary.text = currRd.getText({ fieldId: 'subsidiary' }) || '';
                    objLine.subsidiary.value = currRd.getValue({ fieldId: 'subsidiary' }) || '';


                    // Se obtienen los valores de la cuenta para conocer su posicion presupuestal
                    // objLine.pos_ppto = search.lookupFields({ type: 'account', id: objLine.account.value, columns: ['custrecord_fb_pos_presupuestal_body'] }).custrecord_fb_pos_presupuestal_body[0] || { value: '', text: '' };
                    var url_service_sl = url.resolveScript({
                        scriptId: DATA_SL_SERVICE.SCRIPID,
                        deploymentId: DATA_SL_SERVICE.DEPLOYID,
                        returnExternalUrl: true
                    });
                    let bodyAux = {
                        operador: 'search_posicion_pptal',
                        idAccount: objLine.account.value
                    }
                    var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                    objLine.pos_ppto = JSON.parse(response.body).fieldLookUp.custrecord_fb_pos_presupuestal_body[0];
                    console.log({ title: 'Obj. de linea para realizar las validaciones pertinentes', details: objLine });

                    // Con base a los datos introducidos a nivel linea, se obtienen lo siguiente.
                    // Id del Budget
                    // Monto Original
                    // Monto usado/consumido
                    // Monto restante
                    if (objLine.pos_ppto) {
                        let idBudget = obtainBugetAvailable(currRd, objLine);
                        console.log({ title: 'idBudget', details: idBudget });
                        console.log({ title: 'objLine', details: objLine });

                        objLine.idBudget = idBudget;
                        if (objLine.idBudget.status !== -1 && objLine.idBudget.status !== -2 && objLine.idBudget.status !== -3 && objLine.amount > 0) {
                            let condition = searchPeriodClose(objLine.idBudget.id, objLine.period.value)
                            if (!condition) {
                                currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', value: objLine.idBudget.id });
                                currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_imr_budget_amount_prsonal', value: objLine.idBudget.amount });
                                currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_imr_presupuesto_restante_para', value: objLine.idBudget.amount_restante });
                                currRd.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_imr_presupuesto_consumido', value: objLine.idBudget.amount_consumido });
                            } else {
                                objLine.idBudget.status = -4
                            }
                            objLine.ctrl_ppto.text = currRd.getCurrentSublistText({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist' }) || '';
                            objLine.ctrl_ppto.value = currRd.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist' }) || '';
                        }
                    }
                    let status = validateInfoLine(objLine) || '';

                    if (status !== '') {
                        createAlert({ objLine, status });
                        return false;
                    } else {
                        return true;
                    }
                } else {
                    return true;
                }
            } catch (e) {
                console.error({ title: 'Error validateLine:', details: e.message });
            }
        }
        // Se manejan varios estados como lo es
        // -1 Cuando hubo un error al momento de realizar las operaciones
        // -2 Cuando hay mas de un presupuesto disponible, y dara a seleccionar el requerido
        // -3 Cuando el requerido no satisface al monto restante
        function obtainBugetAvailable(currRd, objLine) {
            {
                try {
                    // let presupuesto = getBudget(currRd, objLine.department.value, objLine.class.value, objLine.account.value, objLine.period.value, objLine.subsidiary.value);
                    // let consumido = getBudgetConsumed(currRd, objLine.department.value, objLine.class.value, objLine.account.value, objLine.period.value, objLine.subsidiary.value);
                    let presupuesto = {};
                    let consumido = 0;
                    var url_service_sl = url.resolveScript({
                        scriptId: DATA_SL_SERVICE.SCRIPID,
                        deploymentId: DATA_SL_SERVICE.DEPLOYID,
                        returnExternalUrl: true
                    });
                    let bodyAux = {
                        operador: 'search_budget_consumend',
                        tipo: currRd.getValue({ fieldId: 'type' }),
                        departamento: objLine.department.value,
                        clase: objLine.class.value,
                        cuenta: objLine.account.value,
                        periodo: objLine.period.value,
                        subsidiaria: objLine.subsidiary.value
                    }
                    var response = https.post({ url: url_service_sl, body: JSON.stringify(bodyAux) })
                    let objRespuesta = JSON.parse(response.body);
                    presupuesto = objRespuesta.presupuesto
                    consumido = objRespuesta.consumido
                    console.log({ title: 'response.body', details: response.body });
                    console.log({ title: 'Presupuestos', details: presupuesto });
                    console.log({ title: 'Pre-Comprometido', details: consumido });
                    let sobrante = (currRd.getValue('type') === 'purchord' ? presupuesto.amountPre : presupuesto.amount) - (consumido + objLine.amount);
                    presupuesto.amount_consumido = consumido
                    presupuesto.amount_restante = sobrante
                    console.log({ title: 'objLine.amount', details: objLine.amount });
                    console.log({ title: 'sobrante', details: sobrante });

                    if (presupuesto.amount_restante <= 0 && presupuesto.status === 0) {
                        presupuesto.status = -3
                    }
                    return presupuesto;
                } catch (e) {
                    console.error({ title: 'Error obtainBudgetAvailable:', details: e });
                    return { status: -1 };
                }
            }
        }
        function searchPeriodClose(id, period) {
            try {
                var customrecord_fb_closing_budgetsSearchObj = search.create({
                    type: "customrecord_fb_closing_budgets",
                    filters:
                        [
                            ["custrecord_fb_ppto_cerrado", "anyof", id],
                            "AND",
                            ["custrecord_fb_cierre_periodo", "anyof", period]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "custrecord_fb_ppto_cerrado", label: "Presupuesto" }),
                            search.createColumn({ name: "custrecord_fb_cierre_periodo", label: "Período" }),
                            search.createColumn({ name: "custrecord_fb_cierre_dia", label: "Día de cierre" })
                        ]
                });
                var searchResultCount = customrecord_fb_closing_budgetsSearchObj.runPaged().count;
                log.debug("customrecord_fb_closing_budgetsSearchObj result count", searchResultCount);
                customrecord_fb_closing_budgetsSearchObj.run().each(function (result) {
                    // .run().each has a limit of 4,000 results
                    return true;
                });

                /*
                customrecord_fb_closing_budgetsSearchObj.id="customsearch1697461708185";
                customrecord_fb_closing_budgetsSearchObj.title="FB - Obten Cierre de Presupuestos - SS (copy)";
                var newSearchId = customrecord_fb_closing_budgetsSearchObj.save();
                */
                return (searchResultCount > 0 ? true : false)
            } catch (e) {
                log.error({ title: 'Error seachPeriodClose:', details: e });
                return true
            }
        }
        /**
         * Valida la informacion a nivel linea, considerando los campos necesarios y 
         * con base a lo obtenido muestra un mensaje u otro
         * @returns {String} Retornara un valor el cual se clasifica en las siguientes lineas
         *      NOT_PP - No se encontro una posicion presupuestal
         *      
         */
        function validateInfoLine(objLine) {
            try {
                let msg = '';
                if (objLine.idBudget.status === -4 && msg === '') {
                    return msg = 'CLOSE_PER'
                }
                if (!objLine.pos_ppto && msg === '') {
                    return msg = 'NOT_PP'
                }
                if (objLine.amount <= 0 && msg === '') {
                    return msg = 'NOT_AMT'
                }
                if (objLine.idBudget.status === -1 && msg === '') {
                    return msg = 'ERR_GETBUD'
                }
                if (objLine.idBudget.status === -2 && msg === '') {
                    return msg = 'MORE_IDS'
                }
                if (objLine.idBudget.status === -3 && msg === '') {
                    return msg = 'NOT_SUF_AMT'
                }
                if (objLine.pos_ppto.value !== '' && objLine.ctrl_ppto.value === '' && msg === '') {
                    return msg = 'NOT_SUF_AMT'
                }
                if (objLine.pos_ppto.value === '' && objLine.ctrl_ppto.value === '' && msg === '') {
                    return msg = 'NOT_PP'
                }
                return msg;
            } catch (e) {
                console.log({ title: 'Error validateInfoLine', details: e });
                return 'ERROR'
            }
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
            try {
                let currRecord = currentRecord.get();

                console.log({ title: 'scriptContext', details: currRecord.getValue('type') });
                console.log({ title: 'Registro', details: currRecord });

                if (currRecord.getValue('type') !== "purchord") {

                    let listPibote = currRecord.getSublist({ sublistId: 'item' });
                    let noLines = currRecord.getLineCount({ sublistId: 'item' });

                    let periodoBG = currRecord.getValue({ fieldId: 'custbody_bm_budgetperiod' });

                    console.log({ title: 'noLines', details: noLines });
                    let arrObj = [];
                    for (let index = 0; index < noLines; index++) {
                        let objAux = {};

                        objAux.ctrl_ppto = currRecord.getSublistText({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', line: index });
                        objAux.ctrl_ppto_id = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', line: index });

                        objAux.clase = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'class', line: index });
                        objAux.departamento = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'department', line: index });

                        objAux.account = currRecord.getSublistText({ sublistId: 'item', fieldId: 'custcol_bm_itemaccount', line: index });
                        objAux.account_id = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_bm_itemaccount', line: index });

                        objAux.amount_in_line = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_fb_ctrl_presupuestal_sublist', line: index });

                        objAux.amount = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: index });

                        arrObj.push(objAux);
                    }

                    // Se agrupa el arreglo con base a los budgets utilizados
                    let arrIdBudget = [];
                    let arrGrouped = arrObj.reduce((acc, line) => {
                        // Se establece el id del budget para generar una busqueda en base a ellos
                        const key = line.departamento;
                        const key2 = line.account_id;
                        arrIdBudget.push(key)
                        if (!acc[key]) {
                            acc[key] = {}
                        }
                        if (!acc[key][key2]) {
                            acc[key][key2] = []
                        }
                        acc[key][key2].push(line);
                        return acc;
                    }, {});

                    console.log({ title: 'arrObj', details: arrObj });
                    console.log({ title: 'arrObj', details: arrGrouped });
                    let numDepartamentos = Object.keys(arrGrouped).length;
                    let multiCentros = ((numDepartamentos > 1) ? true : false);
                    scriptContext.currentRecord.setValue({ fieldId: 'custbody_fb_multi_centros', value: multiCentros })
                    if (multiCentros) {
                        scriptContext.currentRecord.setValue({ fieldId: 'custbody_fb_group_approver_into_body', value: '' })
                        scriptContext.currentRecord.setValue({ fieldId: 'custbody_fb_aprobador_original', value: '' })
                        scriptContext.currentRecord.setValue({ fieldId: 'custbody_fb_posicion_aprobadora', value: '' })
                        scriptContext.currentRecord.setValue({ fieldId: 'nextapprover', value: '' })
                    }
                }
                return true;
            } catch (e) {
                console.log({ title: 'Error saveRecord:', details: e });
            }
        }

        function validationBeforeToSave(arrIdBudget, periodoBG, arrGrouped) {
            try {
                var transactionSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["mainline", "is", "F"],
                            "AND",
                            ["custbody_bm_budget_current", "is", "T"],
                            "AND",
                            ["type", "anyof", "Custom107"],
                            "AND",
                            ["status", "anyof", "Custom107:E"],
                            "AND",
                            ["internalid", "anyof", arrIdBudget]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "account", summary: "GROUP", label: "Account" }),
                            search.createColumn({ name: "department", summary: "GROUP", label: "Department" }),
                            search.createColumn({ name: "class", summary: "GROUP", label: "Class" }),
                            search.createColumn({ name: "custcol_bm_line_bdg_period", summary: "GROUP", label: "Budget Period" }),
                            search.createColumn({ name: "subsidiary", summary: "GROUP", label: "Subsidiary" }),
                            search.createColumn({ name: "amount", summary: "SUM", label: "Amount" })
                        ]
                });
                var searchResultCount = transactionSearchObj.runPaged().count;
                console.log("N. de lineas encontradas con los id", searchResultCount);
                console.log({ title: 'transactionSearchObj', details: transactionSearchObj });
                let columns = transactionSearchObj.columns;
                // Mapeo de las columnas encontradas en la busqueda
                let objColumnas = columns.reduce((acc, columna) => {
                    let name = columna.name;
                    let summary = columna.summary;
                    acc.push([{ name: name, summary: summary }])
                    return acc

                }, {})
                console.log({ title: 'columns', details: objColumnas });
                var myPagedResults = transactionSearchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = myPagedResults.pageRanges;
                // Recorrido para los budgets
                for (var i in thePageRanges) {
                    var thepageData = myPagedResults.fetch({ index: thePageRanges[i].index });
                    thepageData.data.forEach(function (result) {

                        return true;
                    });
                }

                /*
                transactionSearchObj.id="customsearch1692714464039";
                transactionSearchObj.title="FB - Busqueda general para Ctrl PPTO - SS (copy)";
                var newSearchId = transactionSearchObj.save();
                */
            } catch (e) {
                console.log({ title: 'Error validationBeforeToSave:', details: e });
            }
        }
        function createAlert(obj) {
            try {
                console.log({ title: 'obj', details: obj });
                if (obj.status !== '') {
                    // Inicializa el cuerpo del mensaje
                    let details = {
                        title: '',
                        message: ''
                    }
                    // Verifica el codigo obn
                    switch (obj.status) {
                        case 'NOT_GROUP_APP':
                            details.title = 'No se encontro un grupo de aprobacion'
                            details.message = `No se encontro un grupo de aprobación para el departamento ${obj.departamento}`;
                            break;
                        case 'NOT_EMP_IN_GROUP':
                            details.title = 'No se encontro aprobadores configurados'
                            details.message = `No se encontro aprobadores para el departamento ${obj.departamento}`;
                            break;
                        case 'NOT_PP':
                            details.title = 'No se encontro posicion presupuestal'
                            details.message = `Debe tener configurada la Posicion Presupuestal para la cuenta: <br/>${obj.objLine.account.text}.`;
                            break;
                        case 'NOT_AMT':
                            details.title = 'Monto no valido'
                            details.message = 'Ha introducido un monto no valido, el monto debe de ser mayor a 0.';
                            break;
                        case 'CLOSE_PER':
                            details.title = 'Periodo cerrado'
                            details.message = 'El presupuesto encontrado se encuentra cerrado.';
                            break;
                        case 'NOT_SUF_AMT':
                            details.title = 'No hay suficiente monto disponible'
                            details.message = `Existen combinaciones presupuestales que no cuentan con suficiente monto disponible para realizar la transacción:<br/>
                            ${obj.objLine.subsidiary.text} - ${obj.objLine.pos_ppto.text} - ${obj.objLine.department.text} - ${obj.objLine.period.text}`;
                            break;
                        case 'MORE_IDS':
                            details.title = 'Cuenta con mas de un id Budget'
                            details.message = `Existen combinaciones presupuestales que no cuentan con suficiente monto disponible para realizar la transacción:<br/>
                            ${obj.objLine.subsidiary.text} - ${obj.objLine.pos_ppto.text} - ${obj.objLine.department.text} - ${obj.objLine.period.text}`;
                            break;
                        case 'ERR_GETBUD':
                            details.title = 'Error al obtener el budget'
                            details.message = `Ocurrio un error al comparar/obtener la informacion relacionada con el Budget`;
                            break;
                        case 'ERROR':
                            details.title = 'Error inesperado'
                            details.message = 'Por favor contacte a su administrador';
                            break;
                    }
                    dialog.alert(details);
                }
            } catch (e) {
                console.log({ title: 'Error createAlert:', details: e });
            }
        }
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };

    });
