/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/**
* @name TKIO - Control Presupuestal - SL
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Interfaz para carga de control presupuestal
* @copyright Tekiio México 2022
*  
* Last modification  -> 04/08/2023
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> Registro en Netsuite <fb_load_to_ctrl_de_ppto_sl>
*/
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/file', 'N/runtime', 'N/task', 'N/redirect', 'N/ui/message', 'N/url'],
    (serverWidget, search, record, file, runtime, task, redirect, message, url) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        var objProcess = {}
        var fileId = '';
        var idFolderSave = '';
        const onRequest = (scriptContext) => {
            try {

                idFolderSave = runtime.getCurrentScript().getParameter({ name: 'custscript_fb_id_folder_to_save_load' })
                log.audit({ title: 'idFolderSave', details: idFolderSave });
                let request = scriptContext.request.method;
                log.audit({ title: 'scriptContext.request', details: scriptContext.request });
                log.audit({ title: 'request', details: request });
                switch (request) {
                    case 'GET':
                        var params = scriptContext.request.parameters;
                        log.audit({ title: 'params', details: params });
                        // Cuando no existe informacion y espera a la lectura del archivo
                        if (!params.status && !scriptContext.request.parameters.hasOwnProperty('status')) {
                            creaPanel(scriptContext, serverWidget, search, null);
                            // } else if (params.status && !params.hasOwnProperty('taskId')) {
                        } else if (params.status && scriptContext.request.parameters.hasOwnProperty('status') && !scriptContext.request.parameters.hasOwnProperty('taskid')) {
                            // Cuando no existe ejecucion entra para realizar una
                            let filePib = file.load({ id: params.fileId });
                            let lineasArchivo = getLinesByCSV(filePib, params.status);
                            log.audit({ title: 'arrLineas', details: lineasArchivo });
                            if (lineasArchivo.length > 1) {
                                let lineas = obtainFromNetsuite(lineasArchivo);
                                creaPanel(scriptContext, serverWidget, search, lineas);
                            }
                            var userObj = runtime.getCurrentUser();
                            let trkRd = record.create({ type: 'customrecord_fb_tracking_traslados', isDynamic: true })
                            trkRd.setValue({ fieldId: 'custrecord_fb_employee_execute_lp', value: userObj.id })
                            trkRd.setValue({ fieldId: 'custrecord_fb_file_csv', value: params.fileId })
                            // let idTrkRd = 8//trkRd.save({ enableSourcing: true, ignoreMandatoryFields: true })
                            let idTrkRd = trkRd.save({ enableSourcing: true, ignoreMandatoryFields: true })
                            var shTask = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                scriptId: 'customscript_fb_load_to_ctrl_de_ppto_mr',
                                deploymentId: 'customdeploy_fb_load_to_ctrl_de_ppto_mr',
                                params: {
                                    "custscript_fb_id_seguimiento": idTrkRd,
                                    "custscript_fb_load_to_obj_budget": JSON.stringify(objProcess)
                                }
                            });
                            let taskId = shTask.submit();
                            record.submitFields({
                                type: 'customrecord_fb_tracking_traslados',
                                id: idTrkRd,
                                values: {
                                    custrecord_fb_task_id_traslados: taskId
                                }
                            })
                            redirect.toSuitelet({
                                scriptId: 'customscript_fb_load_to_ctrl_de_ppto_sl',
                                deploymentId: 'customdeploy_fb_load_to_ctrl_de_ppto_sl',
                                parameters: {
                                    'status': true,
                                    'taskid': taskId,
                                    'idTrkRd': idTrkRd
                                }
                            });
                        } else if (params.status && scriptContext.request.parameters.hasOwnProperty('status') && scriptContext.request.parameters.hasOwnProperty('taskid')) {
                            log.debug({ title: 'Verificando actualización', details: true });
                            let arrTrasladosGenerados = obtainTrasladosGenerados(params.idTrkRd)
                            log.debug({ title: 'arrTrasladosGenerados', details: arrTrasladosGenerados });
                            creaPanel(scriptContext, serverWidget, search, arrTrasladosGenerados);
                        }
                        break;
                    case 'POST':
                        let archivo = scriptContext.request.files.custpage_file;
                        let obtainById = scriptContext.request.parameters.custpage_search_by_id
                        if (archivo) {
                            let lineasArchivo = getLinesByCSV(archivo, scriptContext.request.parameters.status);
                            log.audit({ title: 'arrLineas', details: lineasArchivo });
                            log.audit({ title: 'Validacion', details: obtainById });
                            if (lineasArchivo.length > 1) {
                                let lineas = obtainFromNetsuite(lineasArchivo);
                                log.debug({ title: 'lineas', details: lineas });
                                creaPanel(scriptContext, serverWidget, search, lineas)
                            }
                        } else {
                            creaPanel(scriptContext, serverWidget, search, null);
                        }

                        break;
                }
            } catch (e) {
                log.error({ title: 'Error onRequest:', details: e });
            }
        }
        function creaPanel(scriptContext, serverWidget, search, lineasArchivo) {
            try {
                var form = serverWidget.createForm({ title: 'Carga de movimientos de Presupuestos', hideNavBar: false });
                form.clientScriptModulePath = '../uievents/fb_load_to_ctrl_de_ppto_cs.js';
                // Se añaden los campos para filtros
                var fileSelect = form.addField({ id: 'custpage_file', label: 'Archivo', type: serverWidget.FieldType.FILE });
                // var searchById = form.addField({ id: 'custpage_search_by_id', label: 'Buscar por ID', type: serverWidget.FieldType.CHECKBOX });
                // Se añaden los botones principales
                if (!scriptContext.request.parameters.status) {
                    form.addSubmitButton({ id: 'custpage_process', label: 'Validar archivo' });
                }
                if (Object.keys(objProcess).length > 0 && !scriptContext.request.parameters.status) {
                    let objProcessString = JSON.stringify(objProcess)
                    log.audit({ title: 'objProcess', details: objProcess });
                    log.audit({ title: 'fileId', details: fileId });
                    form.addButton({ id: 'custpage_generate_traslados', label: 'Genera traslados', functionName: 'generateTraslados(' + objProcessString + ',' + fileId + ')' });
                }
                form.addButton({ id: 'custpage_reset_button', label: 'Reiniciar', functionName: 'reset' });

                var sublist = form.addSublist({ id: 'custpage_detail_list', type: serverWidget.SublistType.LIST, label: 'Detalles' });

                // Añade las columnas
                sublist.addField({ id: 'custpage_check', label: 'Check', type: serverWidget.FieldType.CHECKBOX }).updateDisplayType({ displayType: 'hidden' });
                sublist.addField({ id: 'custpage_detail_validation', label: 'Validación', type: serverWidget.FieldType.TEXT });

                sublist.addField({ id: 'custpage_custom_budget_id', label: 'Id interno Budget', type: serverWidget.FieldType.TEXT });//.updateDisplayType({ displayType: 'hidden' });
                sublist.addField({ id: 'custpage_custom_budget', label: 'Presupuesto', type: serverWidget.FieldType.TEXT });
                sublist.addField({ id: 'custpage_custom_budget_line', label: 'linea de presupuesto', type: serverWidget.FieldType.TEXT });

                sublist.addField({ id: 'custpage_mov_type', label: 'Tipo de movimiento', type: serverWidget.FieldType.TEXT });
                sublist.addField({ id: 'custpage_amount_traslado', label: 'Monto movimiento', type: serverWidget.FieldType.CURRENCY });
                sublist.addField({ id: 'custpage_amount_available', label: 'Monto disponible', type: serverWidget.FieldType.CURRENCY });
                sublist.addField({ id: 'custpage_amount_update', label: 'Monto actualizado', type: serverWidget.FieldType.CURRENCY });

                sublist.addField({ id: 'custpage_subsidiary_id', label: 'Id interno Subsidiaria', type: serverWidget.FieldType.TEXT }).updateDisplayType({ displayType: 'hidden' });
                sublist.addField({ id: 'custpage_subsidiary', label: 'Subsidiaria', type: serverWidget.FieldType.TEXT });

                sublist.addField({ id: 'custpage_account_cont_id', label: 'Id interno Cuenta', type: serverWidget.FieldType.TEXT }).updateDisplayType({ displayType: 'hidden' });
                sublist.addField({ id: 'custpage_account_cont', label: 'Cuenta Contable/ PosPre', type: serverWidget.FieldType.TEXT });

                sublist.addField({ id: 'custpage_department_id', label: 'Id interno departamento', type: serverWidget.FieldType.TEXT }).updateDisplayType({ displayType: 'hidden' });
                sublist.addField({ id: 'custpage_department', label: 'Departamento/ Centro de Costos', type: serverWidget.FieldType.TEXT });

                sublist.addField({ id: 'custpage_class_id', label: 'Id interno Clase', type: serverWidget.FieldType.TEXT }).updateDisplayType({ displayType: 'hidden' });
                sublist.addField({ id: 'custpage_class', label: 'Clase', type: serverWidget.FieldType.TEXT });

                sublist.addField({ id: 'custpage_period_id', label: 'Id interno Periodo', type: serverWidget.FieldType.TEXT }).updateDisplayType({ displayType: 'hidden' });
                sublist.addField({ id: 'custpage_period', label: 'Periodo', type: serverWidget.FieldType.TEXT });

                sublist.addField({ id: 'custpage_memo_or_description', label: 'Memo/ Descripcion', type: serverWidget.FieldType.TEXT });
                if (scriptContext.request.parameters.status && scriptContext.request.parameters.hasOwnProperty('taskid')) {
                    sublist.addField({ id: 'custpage_traslado', label: 'Traslado generado', type: serverWidget.FieldType.TEXT });
                }

                if (lineasArchivo !== null) {
                    lineasArchivo.forEach((line, index) => {

                        if (line.status === 'OK' && scriptContext.request.parameters.status || !scriptContext.request.parameters.status) {

                            sublist.setSublistValue({ id: "custpage_mov_type", line: index, value: line.tipo_de_movimiento || ' ' });
                            sublist.setSublistValue({ id: "custpage_amount_traslado", line: index, value: line.monto || '0.00' });//(line.tipo_de_movimiento === '-' ? '-' : (line.tipo_de_movimiento === '+' ? line.monto : ' ')) || ' ' });
                            sublist.setSublistValue({ id: "custpage_amount_available", line: index, value: line.custpage_amount_available || '0.00' });//(line.tipo_de_movimiento === '-' ? line.custpage_amount_available : '-') || ' ' });
                            sublist.setSublistValue({ id: "custpage_amount_update", line: index, value: line.amount_actualizado || '0.00' });//(line.tipo_de_movimiento === '-' ? line.custpage_amount_available : '-') || ' ' });

                            sublist.setSublistValue({ id: "custpage_detail_validation", line: index, value: line.status || ' ' });

                            sublist.setSublistValue({ id: "custpage_custom_budget", line: index, value: line.custom_budget_id_budget || ' ' });
                            sublist.setSublistValue({ id: "custpage_custom_budget_id", line: index, value: line.custpage_custom_budget_id || ' ' });
                            sublist.setSublistValue({ id: "custpage_custom_budget_line", line: index, value: line.custpage_line_id || ' ' });

                            sublist.setSublistValue({ id: "custpage_subsidiary", line: index, value: line.subsidiaria || ' ' });
                            sublist.setSublistValue({ id: "custpage_subsidiary_id", line: index, value: line.custpage_subsidiary_id || ' ' });

                            sublist.setSublistValue({ id: "custpage_account_cont", line: index, value: line.cuenta_contable_pospre || ' ' });
                            sublist.setSublistValue({ id: "custpage_account_cont_id", line: index, value: line.custpage_account_cont_id || ' ' });

                            sublist.setSublistValue({ id: "custpage_department", line: index, value: line.departamento_centro_de_costos || ' ' });
                            sublist.setSublistValue({ id: "custpage_department_id", line: index, value: line.custpage_department_id || ' ' });

                            sublist.setSublistValue({ id: "custpage_class", line: index, value: line.clase || ' ' });
                            sublist.setSublistValue({ id: "custpage_class_id", line: index, value: line.custpage_class_id || ' ' });

                            sublist.setSublistValue({ id: "custpage_period", line: index, value: line.periodo_mes__año || ' ' });
                            sublist.setSublistValue({ id: "custpage_period_id", line: index, value: line.custpage_period_id || ' ' });

                            sublist.setSublistValue({ id: "custpage_memo_or_description", line: index, value: line.memo_descripción || ' ' });

                            // if (scriptContext.request.parameters.status && scriptContext.request.parameters.hasOwnProperty('taskid')) {
                            if (scriptContext.request.parameters.status && scriptContext.request.parameters.hasOwnProperty('taskid') && line.trasladoName) {

                                let tranLink = url.resolveRecord({ recordType: 'customtransaction_imr_traspaso_de_presup', recordId: line.trasladoId, isEditMode: false });
                                sublist.setSublistValue({ id: "custpage_traslado", line: index, value: "<a href=" + tranLink + ">" + line.trasladoName || ' ' + "</a>" || ' ' });
                                // sublist.setSublistValue({ id: "custpage_traslado", line: index, value: line.trasladoName || ' ' });
                            }
                        }
                    })
                    if (scriptContext.request.parameters.status && scriptContext.request.parameters.hasOwnProperty('taskid')) {
                        let status = task.checkStatus({ taskId: scriptContext.request.parameters.taskid });
                        log.audit({ title: 'status', details: status });
                        let statusDef = status.status;
                        switch (statusDef) {
                            case 'PENDING':
                                var messageObj = message.create({ type: message.Type.INFORMATION, message: 'Pendiente en la generación de traslados...', duration: 15000 });
                                form.addPageInitMessage({ message: messageObj });
                                break;
                            case 'PROCESSING':
                                var messageObj = message.create({ type: message.Type.INFORMATION, message: 'Generando traslados, espere un momento y recargue la pagina...', duration: 15000 });
                                form.addPageInitMessage({ message: messageObj });
                                break;
                            case 'COMPLETE':
                                var messageObj = message.create({ type: message.Type.CONFIRMATION, message: 'Generacion de traslados completada, vea su resumen!', duration: 15000 });
                                form.addPageInitMessage({ message: messageObj });
                                break;
                            case 'FAILED':
                                var messageObj = message.create({ type: message.Type.WARNING, message: 'Unexpected error, contact your administrator', duration: 15000 });
                                form.addPageInitMessage({ message: messageObj });
                                break;
                        }
                    }
                }

                scriptContext.response.writePage(form);
            } catch (e) {
                log.error({ title: 'Error creaPanel:', details: e });
            }
        }
        function getLinesByCSV(archivo, status) {
            try {
                let arrKey = [];
                let condition = true;
                let arrLineas = [];
                // Se obtienen todas las lineas y se iteran
                log.audit({ title: 'archivo', details: archivo });
                if (!status) {
                    log.audit({ title: 'Contenido', details: archivo.getContents() });
                    log.audit({ title: 'idFolderSave', details: idFolderSave });
                    log.audit({ title: 'Fecha', details: new Date() });
                    let fecha = new Date;
                    const fechaActual = new Date();

                    let name = `Traslado Doc ${fechaActual.getFullYear()}-${fechaActual.getMonth() + 1}-${fechaActual.getDate()}-${fechaActual.getHours()}-${fechaActual.getMinutes()}-${fechaActual.getSeconds()}`
                    var fileObj = file.create({
                        name: (name + '.csv'),
                        fileType: file.Type.CSV,
                        encoding: file.Encoding.WINDOWS_1252,
                        contents: archivo.getContents()
                    });
                    fileObj.folder = idFolderSave;
                    fileId = fileObj.save();
                }
                var iterator = archivo.lines.iterator();
                iterator.each(function (line) {
                    var lineKeys = line.value.split(',');

                    if (condition) {
                        // Obtiene las keys/headers del archivo CSV
                        lineKeys.map(lineKey => {
                            let newKey = lineKey.toLowerCase();
                            newKey = newKey.split('.').join('');
                            newKey = newKey.split('(').join('');
                            newKey = newKey.split(')').join('');
                            newKey = newKey.split('/').join('');
                            newKey = newKey.split('-').join('');
                            newKey = newKey.split(' ').join('_');
                            arrKey.push(newKey);
                        })
                        log.audit({ title: 'lineValues', details: arrKey });
                        condition = false;
                    } else {
                        let objAux = {}
                        for (let iterador = 0; iterador < arrKey.length; iterador++) {
                            let valuePib = lineKeys[iterador];
                            valuePib = valuePib.split("\\").join('');
                            valuePib = valuePib.split('"').join('');
                            switch (arrKey[iterador]) {
                                case 'custom_budget_id_budget':
                                    valuePib = valuePib.split('Custom Budget #').join('');
                                    break;

                            }
                            objAux[arrKey[iterador]] = valuePib;
                        }
                        arrLineas.push(objAux);
                    }
                    return true;
                });
                return arrLineas;
            } catch (e) {
                log.error({ title: 'Error getLinesByCSV:', details: e });
                return []
            }
        }
        function obtainFromNetsuite(lineasArchivo) {
            try {
                let noDocument = [];
                let filtros = [
                    ["type", "anyof", "Custom107"],
                    "AND",
                    ["mainline", "is", "F"],
                    "AND"
                ]
                lineasArchivo.forEach((line) => {
                    if (!noDocument.includes(line.custom_budget_id_budget)) {
                        noDocument.push(line.custom_budget_id_budget);
                    }
                })

                let arrNoDoc = []
                for (let i = 0; i < noDocument.length; i++) {
                    if (i === 0) {
                        arrNoDoc.push(["numbertext", "is", noDocument[i]])
                    } else {
                        arrNoDoc.push("OR", ["numbertext", "is", noDocument[i]])
                    }
                }
                filtros.push(arrNoDoc)
                log.audit({ title: 'noDocument', details: noDocument });
                log.audit({ title: 'filtros', details: filtros });
                // Mapeo para obtener los datos del budget
                let arrNameBudget = [];
                for (let i = 0; i < noDocument.length; i++) {
                    if (i === 0) {
                        arrNameBudget.push(["custbody_imr_custom_budget_name", "is", `Custom Budget #${noDocument[i]}`])
                    } else {
                        arrNameBudget.push("OR", ["custbody_imr_custom_budget_name", "is", `Custom Budget #${noDocument[i]}`])
                    }
                }
                let trasladosMontos = obtainTrasladosByIdBudget(arrNameBudget);
                log.audit({ title: 'trasladosMontos', details: trasladosMontos });
                let agrupadorTraslados = trasladosMontos.reduce((grupo, line) => {
                    let idBudget = line.id_budget;
                    let lineBudget = line.line_budget;
                    if (!grupo[idBudget]) {
                        grupo[idBudget] = {}
                    }
                    if (!grupo[idBudget][lineBudget]) {
                        grupo[idBudget][lineBudget] = 0
                    }
                    // grupo[idBudget][lineBudget].push(parseFloat(line.amount_total));
                    grupo[idBudget][lineBudget] += parseFloat(line.amount_total);

                    return grupo;
                }, {});
                log.audit({ title: 'agrupadorTraslados', details: agrupadorTraslados });
                var searchObj = search.create({
                    type: "transaction",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "tranid", label: "Document Number" }),
                            search.createColumn({ name: "amount", label: "Amount" }),
                            search.createColumn({ name: "custcol_imr_presu_restante", label: "Prespuesto restante" }),
                            search.createColumn({ name: "custcol_imr_presu_consumido", label: "Prespuesto consumido" }),
                            search.createColumn({ name: "account", label: "Account" }),
                            search.createColumn({ name: "department", label: "Department" }),
                            search.createColumn({ name: "class", label: "Class" }),
                            search.createColumn({ name: "custcol_bm_line_bdg_period", label: "Budget Period" }),
                            search.createColumn({ name: "subsidiary", label: "Subsidiary" }),
                            search.createColumn({ name: "subsidiarynohierarchy", label: "Subsidiary (no hierarchy)" }),
                            search.createColumn({ name: "internalid", join: "subsidiary", label: "Internal ID" }),
                            search.createColumn({ name: "custcol_bm_line_bdg_period", label: "Budget Period" }),
                            search.createColumn({ name: "line", label: "Line ID" })
                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("searchObj result count", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = Object.assign({}, objAux);
                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        objPib.amount_total_traslado = (agrupadorTraslados[objPib.internalid.value] ? (agrupadorTraslados[objPib.internalid.value][objPib.line] ? agrupadorTraslados[objPib.internalid.value][objPib.line] : 0) : 0)
                        arrDataSearch.push(objPib);
                        return true;
                    });
                }
                log.audit({ title: 'arrDataSearch', details: arrDataSearch });
                let arrNew = validateExists(arrDataSearch, lineasArchivo)
                /*
                searchObj.id="customsearch1692813642256";
                searchObj.title="FB - Get budget Tran - SS (copy)";
                var newSearchId = searchObj.save();
                */
                return arrNew
            } catch (e) {
                log.error({ title: 'Error obtainFromNetsuite:', details: e });
            }
        }
        function obtainTrasladosByIdBudget(ids) {
            try {
                log.audit({ title: 'ids', details: ids });
                let filtros = [
                    ["mainline", "is", "F"], "AND",
                    ["type", "anyof", "Custom116"], "AND",
                    ["status", "anyof", "Custom115:A"], "AND"
                ]
                filtros.push(ids)
                log.audit({ title: 'filtros', details: filtros });
                var searchObj = search.create({
                    type: "transaction",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "custbody_imr_custom_budget_id", label: "Custom Budget Id" }),
                            search.createColumn({ name: "amount", label: "Amount" }),
                            search.createColumn({ name: "custcol_imr_import_mirror", label: "Incremento decremento" }),
                            search.createColumn({ name: "custcol_imr_pr_line_nom", label: "Línea" }),

                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("No. Resultados de Traslados generados:", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = {
                            id_budget: result.getValue({ name: "custbody_imr_custom_budget_id" }) || ' ',
                            line_budget: result.getValue({ name: "custcol_imr_pr_line_nom" }) || ' ',
                            amount_total: result.getValue({ name: "custcol_imr_import_mirror" }) || '0',
                        }

                        arrDataSearch.push(objPib);
                        return true;
                    });
                }

                return arrDataSearch;
            } catch (e) {
                log.error({ title: 'Error obtainTrasladosByIdBudget:', details: e });
                return [];
            }
        }
        function obtainTrasladosGenerados(id) {
            try {

                var searchObj = search.create({
                    type: "customrecord_fb_traslado_generado_ppm",
                    filters: [
                        ["custrecord_fb_group_generated", "anyof", id]
                    ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_fb_traslado_generado", label: "Traslado generado" }),
                            search.createColumn({ name: "custrecord_fb_budget_usage", label: "Budget" }),
                            search.createColumn({ name: "custrecord_fb_subsidiary_to_line", label: "Subsidiaria" }),
                            search.createColumn({ name: "custrecord_fb_type_movement", label: "Tipo de movimiento" }),
                            search.createColumn({ name: "custrecord_fb_class_to_line", label: "Clase" }),
                            search.createColumn({ name: "custrecord_fb_account_to_line", label: "Cuenta contable" }),
                            search.createColumn({ name: "custrecord_fb_department_to_line", label: "Departamento" }),
                            search.createColumn({ name: "custrecord_fb_group_generated", label: "Grupo de generación" }),
                            search.createColumn({ name: "custrecord_fb_memo_description_to_line", label: "Memo/ Descripción" }),
                            search.createColumn({ name: "custrecord_fb_amount_to_line", label: "Monto" }),
                            search.createColumn({ name: "created", label: "Date Created" }),
                            search.createColumn({ name: "custrecord_fb_periodo_into_tm", label: "PERIODO" }),
                            search.createColumn({ name: "namenohierarchy", join: "CUSTRECORD_FB_SUBSIDIARY_TO_LINE", label: "Name (no hierarchy)" })

                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("No. Resultados de Traslados generados:", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = {
                            tipo_de_movimiento: result.getValue({ name: "custrecord_fb_type_movement" }) || ' ',
                            monto: result.getValue({ name: 'custrecord_fb_amount_to_line' }) || '0.00',
                            custpage_amount_available: '0.00',
                            status: 'OK',
                            custom_budget_id_budget: result.getText({ name: 'custrecord_fb_budget_usage' }) || ' ',
                            custpage_custom_budget_id: result.getValue({ name: 'custrecord_fb_budget_usage' }) || ' ',
                            custpage_line_id: '-',
                            subsidiaria: result.getValue({ name: "namenohierarchy", join: "CUSTRECORD_FB_SUBSIDIARY_TO_LINE" }) || ' ',
                            custpage_subsidiary_id: result.getValue({ name: "custrecord_fb_subsidiary_to_line" }) || ' ',
                            cuenta_contable_pospre: result.getText({ name: 'custrecord_fb_account_to_line' }) || ' ',
                            custpage_account_cont_id: result.getValue({ name: 'custrecord_fb_account_to_line' }) || ' ',
                            departamento_centro_de_costos: result.getText({ name: 'custrecord_fb_department_to_line' }) || ' ',
                            custpage_department_id: result.getValue({ name: 'custrecord_fb_department_to_line' }) || ' ',
                            clase: result.getText({ name: 'custrecord_fb_class_to_line' }) || ' ',
                            custpage_class_id: result.getValue({ name: 'custrecord_fb_class_to_line' }) || ' ',
                            periodo_mes__año: result.getText({ name: 'custrecord_fb_periodo_into_tm' }) || ' ',
                            custpage_period_id: result.getValue({ name: 'custrecord_fb_periodo_into_tm' }) || ' ',
                            memo_descripción: result.getValue({ name: 'custrecord_fb_memo_description_to_line' }) || ' ',
                            trasladoId: result.getValue({ name: 'custrecord_fb_traslado_generado' }) || ' ',
                            trasladoName: result.getText({ name: 'custrecord_fb_traslado_generado' }) || ' ',
                        }

                        arrDataSearch.push(objPib);
                        return true;
                    });
                }

                return arrDataSearch;
            } catch (e) {
                log.error({ title: 'Error obtainTrasladosGenerados:', details: e });
                return [];
            }
        }
        function obtainSubsidiaria(arrSubsidiaria) {
            try {
                arrSubsidiaria = [... new Set(arrSubsidiaria)]
                let arrNoDoc = [];
                let filtros = [];
                for (let i = 0; i < arrSubsidiaria.length; i++) {
                    if (i === 0) {
                        arrNoDoc.push(["name", "contains", arrSubsidiaria[i]])
                    } else {
                        arrNoDoc.push("OR", ["name", "contains", arrSubsidiaria[i]])
                    }
                }
                filtros.push(arrNoDoc)
                log.audit({ title: 'arrSubsidiaria', details: arrSubsidiaria });

                var searchObj = search.create({
                    type: "subsidiary",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "namenohierarchy", label: "Name (no hierarchy)" }),
                            search.createColumn({ name: "internalid", label: "Internal ID" })

                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("No. Resultados de cuentas:", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = Object.assign({}, objAux);

                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        arrDataSearch.push(objPib);
                        return true;
                    });
                }

                return arrDataSearch;
            } catch (e) {
                log.error({ title: 'Error obtainSubsidiary:', details: e });
                return [];
            }
        }
        function obtainDepartment(arrDepartment) {
            try {
                arrDepartment = [... new Set(arrDepartment)]
                let arrNoDoc = [];
                let filtros = [];
                for (let i = 0; i < arrDepartment.length; i++) {
                    if (i === 0) {
                        arrNoDoc.push(["name", "is", arrDepartment[i]])
                    } else {
                        arrNoDoc.push("OR", ["name", "is", arrDepartment[i]])
                    }
                }
                filtros.push(arrNoDoc)
                log.audit({ title: 'arrDepartment', details: arrDepartment });

                var searchObj = search.create({
                    type: "department",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "name", sort: search.Sort.ASC, label: "Name" }),
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "subsidiary", label: "Subsidiaria" })

                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("No. Resultados de cuentas:", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = Object.assign({}, objAux);

                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        arrDataSearch.push(objPib);
                        return true;
                    });
                }

                return arrDataSearch;
            } catch (e) {
                log.error({ title: 'Error obtainDepartment:', details: e });
                return [];
            }
        }
        function obtainAccount(arrAccountNumber) {
            try {
                arrAccountNumber = [... new Set(arrAccountNumber)]
                let arrNoDoc = [];
                let filtros = [];
                for (let i = 0; i < arrAccountNumber.length; i++) {
                    if (i === 0) {
                        arrNoDoc.push(["number", "is", arrAccountNumber[i]])
                    } else {
                        arrNoDoc.push("OR", ["number", "is", arrAccountNumber[i]])
                    }
                }
                filtros.push(arrNoDoc)
                log.audit({ title: 'arrAccountNumber', details: arrAccountNumber });

                var searchObj = search.create({
                    type: "account",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "displayname", label: "Display Name" }),
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "number", label: "Number" })
                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("No. Resultados de cuentas:", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = Object.assign({}, objAux);

                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        arrDataSearch.push(objPib);
                        return true;
                    });
                }

                return arrDataSearch
            } catch (e) {
                log.error({ title: 'Error obtainAccount:', details: e });
            }
        }
        function obtainClass(arrClass) {
            try {
                arrClass = [... new Set(arrClass)]
                let arrNoDoc = [];
                let filtros = [];
                for (let i = 0; i < arrClass.length; i++) {
                    if (i === (arrClass.length - 1)) {
                        arrNoDoc.push(["name", "is", arrClass[i]])
                    } else {
                        arrNoDoc.push(["name", "is", arrClass[i]], "OR")
                    }
                }
                filtros.push(arrNoDoc)
                log.audit({ title: 'arrClass', details: arrClass });
                log.audit({ title: 'filtros', details: arrNoDoc });
                var searchObj = search.create({
                    type: "classification",
                    filters: arrNoDoc,
                    columns:
                        [
                            search.createColumn({ name: "name", sort: search.Sort.ASC, label: "Name" }),
                            search.createColumn({ name: "internalid", label: "Internal ID" })
                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("No. Resultados de clases:", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = Object.assign({}, objAux);

                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        // objPib.class.text = objPib.class.text.normalize("NFD").split(/[\u0300-\u036f]/g).join("").split(/[^\w\s]|_/g).join("")
                        arrDataSearch.push(objPib);
                        return true;
                    });
                }

                return arrDataSearch
            } catch (e) {
                log.error({ title: 'Error obtainClass:', details: e });
                return [];
            }
        }
        function obtainPeriod(arrPeriod) {
            try {
                arrPeriod = [... new Set(arrPeriod)]
                let arrNoDoc = [];
                let filtros = [];
                for (let i = 0; i < arrPeriod.length; i++) {
                    if (i === 0) {
                        arrNoDoc.push(["periodname", "contains", arrPeriod[i]])
                    } else {
                        arrNoDoc.push("OR", ["periodname", "contains", arrPeriod[i]])
                    }
                }
                filtros.push(arrNoDoc)
                log.audit({ title: 'arrPeriod', details: arrPeriod });

                var searchObj = search.create({
                    type: "accountingperiod",
                    filters: filtros,
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "periodname", sort: search.Sort.ASC, label: "Name" }),
                            search.createColumn({ name: "formulatext", formula: "TO_CHAR({startdate},'yyyy')", label: "Formula (Text)" })
                        ]
                });
                var searchResultCount = searchObj.runPaged().count;
                log.debug("No. Resultados de periodo:", searchResultCount);

                // Mapeo de las columnas para colocar los valores de la BG
                let columnsName = searchObj.run().columns;
                let objAux = {};
                columnsName.forEach(obj => {
                    if (obj.join) {
                        if (objAux[obj.join]) {
                            objAux[obj.join][obj.name] = {}
                        } else {
                            objAux[obj.join] = {}
                            objAux[obj.join][obj.name] = {}
                        }
                    } else {
                        objAux[obj.name] = {}
                    }
                });

                let arrDataSearch = []
                let dataResults = searchObj.runPaged({ pageSize: 1000 });
                var thePageRanges = dataResults.pageRanges;
                for (var i in thePageRanges) {
                    var searchPage = dataResults.fetch({ index: thePageRanges[i].index });
                    searchPage.data.forEach(function (result) {
                        // log.audit({ title: 'result', details: result });
                        let objPib = Object.assign({}, objAux);

                        for (key in columnsName) {
                            let values = {}
                            let text = result.getText(columnsName[key]);
                            let value = result.getValue(columnsName[key])
                            if (text) {
                                values.text = text;
                                values.value = value;
                            } else {
                                values = value;
                            }
                            if (columnsName[key].join) {
                                objPib[columnsName[key].join][columnsName[key].name] = values
                            } else {
                                objPib[columnsName[key].name] = values
                            }
                        }
                        arrDataSearch.push(objPib);
                        return true;
                    });
                }

                return arrDataSearch
            } catch (e) {
                log.error({ title: 'Error obtainClass:', details: e });
                return [];
            }
        }
        function validateExists(arrDataSearch, lineasArchivo) {
            try {
                let arrSubsidiaria = [];
                let arrDepartment = [];
                let arrAccountNumber = [];
                let arrClass = [];
                let arrPeriod = []
                // Mapeo para obtencion de los valores reales
                lineasArchivo.forEach(linea => {
                    if (!arrDepartment.includes(linea.departamento_centro_de_costos)) {
                        arrDepartment.push(linea.departamento_centro_de_costos);
                    }
                    if (!arrSubsidiaria.includes(linea.subsidiaria)) {
                        arrSubsidiaria.push(linea.subsidiaria);
                    }
                    if (!arrAccountNumber.includes(linea.cuenta_contable_pospre)) {
                        arrAccountNumber.push(linea.cuenta_contable_pospre);
                    }
                    if (!arrClass.includes(linea.clase)) {
                        arrClass.push(linea.clase);
                    }
                    if (!arrPeriod.includes(linea.periodo_mes__año)) {
                        arrPeriod.push(linea.periodo_mes__año);
                    }
                });
                // Se obtienen los datos necesarios de la lista de registros, para validar si la informacion para las cargas son validas
                let arrObjAccount = obtainAccount(arrAccountNumber);
                let arrObjDepartment = obtainDepartment(arrDepartment);
                let arrObjSubsidiary = obtainSubsidiaria(arrSubsidiaria);
                let arrObjClass = obtainClass(arrClass);
                let arrObjPeriod = obtainPeriod(arrPeriod);
                log.audit({ title: 'arrObjAccount', details: arrObjAccount });
                log.audit({ title: 'arrObjDepartment', details: arrObjDepartment });
                log.audit({ title: 'arrObjSubsidiary', details: arrObjSubsidiary });
                log.audit({ title: 'arrObjClass', details: arrObjClass });
                log.audit({ title: 'arrObjPeriod', details: arrObjPeriod });
                let montoRestante = 0;
                let lineaPib = '';
                let newArr = lineasArchivo.map((linePib) => {
                    linePib.status = '';
                    // Se valida la existencia de aquellas lineas de donde se obtendran los montos
                    if (!arrDataSearch.some((resultPib) => resultPib.tranid === linePib.custom_budget_id_budget)) {
                        linePib.status = 'No se encontro el registro BUDGET';
                    }
                    // Valida el tipo de movimiento
                    else if (linePib.tipo_de_movimiento !== '+' && linePib.tipo_de_movimiento !== '-') {
                        linePib.status = 'Tipo de movimiento invalido, tiene que ser + ó -';
                    }
                    else if (!isNaN(linePib.monto) && linePib.monto === '') {
                        linePib.status = 'El monto introducido debe ser un numero';
                    }
                    // Valida los datos de la cuenta donde se obtendra la info para el traspaso
                    if (linePib.status === '') {
                        switch (linePib.tipo_de_movimiento) {
                            case '-':
                                // Valida la existencia de la subsidiaria
                                if (!arrDataSearch.some((resultPib) => resultPib.subsidiarynohierarchy.text === linePib.subsidiaria)) {
                                    linePib.status = 'No se encontro la Subsidiaria';
                                }
                                // Valida la existencia de la cuenta contable
                                else if (!arrDataSearch.some((resultPib) => (resultPib.account.text).includes(linePib.cuenta_contable_pospre))) {
                                    linePib.status = 'No se encontro la cuenta contable';
                                }
                                // Valida la existencia del departamento
                                else if (!arrDataSearch.some((resultPib) => resultPib.department.text === linePib.departamento_centro_de_costos)) {
                                    linePib.status = 'No se encontro el departamento';
                                }
                                // Valida la existencia de la clase
                                else if (!arrDataSearch.some((resultPib) => resultPib.class.text === linePib.clase)) {
                                    linePib.status = 'No se encontro la clase';
                                }
                                // Valida la existencia del periodo contable
                                else if (!arrDataSearch.some((resultPib) => (resultPib.custcol_bm_line_bdg_period.text).includes(linePib.periodo_mes__año))) {
                                    linePib.status = 'No se encontro el periodo contable';
                                }
                                // Todo los datos necesarios fueron encontrados
                                else {
                                    linePib.status = 'OK';
                                }
                                // Obteniendo la informacion del objeto pibote
                                if (linePib.status === 'OK') {
                                    let lineEncontrada = arrDataSearch.find((result) => result.tranid === linePib.custom_budget_id_budget && result.subsidiarynohierarchy.text === linePib.subsidiaria &&
                                        (result.account.text).includes(linePib.cuenta_contable_pospre) && result.department.text === linePib.departamento_centro_de_costos && result.class.text === linePib.clase &&
                                        (result.custcol_bm_line_bdg_period.text).includes(linePib.periodo_mes__año));
                                    log.audit({ title: 'lineEncontrada', details: lineEncontrada });
                                    if (lineEncontrada) {
                                        if (!linePib.custpage_line_id && !lineasArchivo.find((linea) => (linea.custpage_line_id === lineEncontrada.line))) {
                                            lineaPib = linePib.linea
                                            let restante = (lineEncontrada.custcol_imr_presu_restante === '' ? lineEncontrada.amount : lineEncontrada.custcol_imr_presu_restante)
                                            montoRestante = parseFloat(restante) - parseFloat(lineEncontrada.amount_total_traslado);
                                            linePib.custpage_custom_budget_id = lineEncontrada.internalid.value;
                                            linePib.custpage_custom_budget_debito = lineEncontrada.internalid.value;
                                            linePib.monto = restante;
                                            linePib.custpage_amount_available = montoRestante;//lineEncontrada.custcol_imr_presu_restante
                                            linePib.custpage_subsidiary_id = lineEncontrada.subsidiary.value;
                                            linePib.custpage_account_cont_id = lineEncontrada.account.value;
                                            linePib.custpage_department_id = lineEncontrada.department.value;
                                            linePib.custpage_class_id = lineEncontrada.class.value;
                                            linePib.custpage_period_id = lineEncontrada.custcol_bm_line_bdg_period.value;
                                            linePib.custpage_line_id = lineEncontrada.line;
                                            linePib.amount_consum = parseFloat((lineEncontrada.custcol_imr_presu_consumido === '' ? '0' : lineEncontrada.custcol_imr_presu_consumido))
                                            linePib.amount_restante = montoRestante;
                                            linePib.amount_actualizado = montoRestante;
                                            linePib.amount_original = parseFloat(lineEncontrada.amount);
                                        }
                                        else {
                                            linePib.status = 'Intenta hacer un traspaso de una misma linea del budget';
                                        }
                                    } else {
                                        linePib.status = 'No se tiene informacion de este registro';
                                    }
                                }
                                break;
                            case '+':
                                let lineaCredito = lineasArchivo.find(linea => (linea.linea === linePib.linea && linea.custpage_line_id));
                                if (lineaCredito) {
                                    let subsidiaryObj = arrObjSubsidiary.find(acc => acc.namenohierarchy === linePib.subsidiaria) || null;
                                    let departamentObj = arrObjDepartment.find(acc => acc.name === linePib.departamento_centro_de_costos) || null;
                                    log.audit({ title: 'departamentObj', details: departamentObj }) || null;
                                    let accountObj = arrObjAccount.find(acc => acc.number === linePib.cuenta_contable_pospre) || null;
                                    let classObj = arrObjClass.find(acc => acc.name === linePib.clase) || null;
                                    let periodObj = arrObjPeriod.find(acc => acc.periodname === linePib.periodo_mes__año) || null;
                                    let subPorDep = (departamentObj ? departamentObj.subsidiary.split(', ') : []);
                                    let subsidiariaEncontrada = subPorDep.find((sub) => sub === linePib.subsidiaria) || null;
                                    log.audit({ title: 'subsidiariaEncontrada', details: subsidiariaEncontrada });
                                    // Busca el budget para generar o no la nueva linea
                                    let budgetEncontrado = arrDataSearch.find((result) => result.tranid === linePib.custom_budget_id_budget) || null;
                                    log.audit({ title: 'budgetEncontrado', details: budgetEncontrado });
                                    if (accountObj && departamentObj && subsidiariaEncontrada && subsidiaryObj && periodObj && budgetEncontrado&& classObj) {
                                        let lineEncontrada = arrDataSearch.find((result) => result.tranid === linePib.custom_budget_id_budget && result.subsidiarynohierarchy.text === linePib.subsidiaria &&
                                            (result.account.text).includes(linePib.cuenta_contable_pospre) && result.department.text === linePib.departamento_centro_de_costos && result.class.text === linePib.clase &&
                                            (result.custcol_bm_line_bdg_period.text).includes(linePib.periodo_mes__año)) || {};
                                        log.debug({ title: 'lineEncontrada', details: lineEncontrada });
                                        log.debug({ title: 'lineEncontrada', details: typeof lineEncontrada });
                                        log.debug({ title: 'lineEncontrada', details: Object.keys(lineEncontrada).length });
                                        if (Object.keys(lineEncontrada).length !== 0) {
                                            linePib.custpage_amount_available = parseFloat(lineEncontrada.custcol_imr_presu_restante === '' ? lineEncontrada.amount : lineEncontrada.custcol_imr_presu_restante) + parseFloat(linePib.monto)
                                            linePib.custpage_custom_budget_id = lineaCredito.custpage_custom_budget_id
                                            linePib.custpage_custom_budget_debito = budgetEncontrado.internalid.value
                                            linePib.custpage_subsidiary_id = subsidiaryObj.internalid.value
                                            linePib.custpage_account_cont_id = accountObj.internalid.value
                                            linePib.custpage_department_id = departamentObj.internalid.value
                                            linePib.custpage_class_id = classObj.internalid.value
                                            linePib.custpage_period_id = periodObj.internalid.value
                                            linePib.custpage_line_id = lineEncontrada.line
                                            linePib.amount_consum = lineaCredito.amount_consum
                                            linePib.amount_restante = parseFloat(lineEncontrada.custcol_imr_presu_restante === '' ? lineEncontrada.amount : lineEncontrada.custcol_imr_presu_restante) //+ parseFloat(linePib.monto)
                                            linePib.amount_actualizado = linePib.amount_restante//parseFloat(lineEncontrada.custcol_imr_presu_restante === '' ? lineEncontrada.amount : lineEncontrada.custcol_imr_presu_restante) + parseFloat(linePib.monto)
                                            linePib.amount_original = lineEncontrada.amount
                                            linePib.status = 'OK'
                                        } else {
                                            log.debug({title: 'lineaCredito', details: lineaCredito});
                                            log.debug({title: 'subsidiaryObj', details: subsidiaryObj});
                                            log.debug({title: 'accountObj', details: accountObj});
                                            log.debug({title: 'departamentObj', details: departamentObj});
                                            log.debug({title: 'classObj', details: classObj});
                                            log.debug({title: 'No. keys', details: Object.keys(classObj).length});
                                            log.debug({title: 'classObj', details: typeof classObj});
                                            log.debug({title: 'periodObj', details: periodObj});
                                            linePib.custpage_amount_available = 0
                                            linePib.custpage_custom_budget_id = lineaCredito.custpage_custom_budget_id
                                            linePib.custpage_custom_budget_debito = budgetEncontrado.internalid.value
                                            linePib.custpage_subsidiary_id = subsidiaryObj.internalid.value
                                            linePib.custpage_account_cont_id = accountObj.internalid.value
                                            linePib.custpage_department_id = departamentObj.internalid.value
                                            linePib.custpage_class_id = classObj.internalid.value
                                            linePib.custpage_period_id = periodObj.internalid.value
                                            linePib.custpage_line_id = ''
                                            linePib.amount_consum = 0
                                            linePib.amount_restante = 0
                                            linePib.amount_original = linePib.monto
                                            linePib.amount_actualizado = linePib.monto
                                            linePib.status = 'Se realizará el traslado a la nueva linea'
                                        }
                                    } else {
                                        let statusDes = '';
                                        statusDes += (!subsidiaryObj ? (statusDes === '' ? 'No se encontro la subsidiaria' : ', No se encontro la subsidiaria') : '');
                                        statusDes += (!subsidiariaEncontrada ? (statusDes === '' ? 'El departamento no se encuentra dentro de la subsidiaria' : ', El departamento no se encuentra dentro de la subsidiaria') : '');
                                        statusDes += (!departamentObj ? (statusDes === '' ? 'No se encontro el departamento' : ', No se encontro el departamento') : '');
                                        statusDes += (!accountObj ? (statusDes === '' ? 'No se encontro la cuenta' : ', No se encontro la cuenta') : '');
                                        statusDes += (!classObj ? (statusDes === '' ? 'No se encontro la clase' : ', No se encontro la clase') : '');
                                        statusDes += (!periodObj ? (statusDes === '' ? 'No se encontro el periodo' : ', No se encontro el periodo') : '');
                                        statusDes += (!budgetEncontrado ? (statusDes === '' ? 'No se encontro el Budget' : ', No se encontro el Budget') : '');
                                        linePib.status = statusDes
                                    }
                                } else {
                                    linePib.status = 'No se encontro la linea de credito en el archivo CSV.';
                                }
                                break;
                        }
                    }

                    return linePib
                }, {});
                log.audit({ title: 'newArr', details: newArr });
                let newSecondValidation = newArr.reduce((grupo, line) => {
                    let lineIdCSV = line.linea;
                    if (!grupo[lineIdCSV]) {
                        grupo[lineIdCSV] = []
                    }
                    grupo[lineIdCSV].push(line);
                    return grupo;
                }, {});
                log.debug({ title: 'Agrupando para realizar el ajuste de la linea', details: newSecondValidation });
                let newArr2 = [];
                for (line in newSecondValidation) {
                    let arr = newSecondValidation[line];
                    if (arr.length >= 2 && arr.find(linePib => linePib.tipo_de_movimiento === '-')) {
                        let lineCredito = arr.find(linePib => linePib.tipo_de_movimiento === '-');
                        let arrSuma = arr.filter(linePib => linePib.tipo_de_movimiento === '+');
                        let restaSubtotal = parseFloat(lineCredito.amount_restante);
                        log.debug({ title: 'arrSuma', details: arrSuma });
                        arrSuma.map(linePib => {
                            if ((linePib.status === 'OK' || linePib.status === 'Se realizará el traslado a la nueva linea')) {
                                if (restaSubtotal >= 0 && (linePib.status === 'OK' || linePib.status === 'Se realizará el traslado a la nueva linea')) {
                                    restaSubtotal -= parseFloat(linePib.monto)
                                    linePib.amount_actualizado = (linePib.status === 'Se realizará el traslado a la nueva linea' ? parseFloat(linePib.amount_actualizado) : parseFloat(linePib.amount_actualizado) + parseFloat(linePib.monto))
                                    linePib.status = (restaSubtotal >= 0 ? linePib.status : 'No puede realizar traslado porque excede del monto restante')
                                } else {
                                    linePib.status = (restaSubtotal >= 0 ? linePib.status : 'No puede realizar traslado porque excede del monto restante')
                                }
                            }
                        })
                        lineCredito.amount_actualizado = restaSubtotal
                        lineCredito.amount_restado = parseFloat(lineCredito.amount_restante) - restaSubtotal
                        newArr2.push(lineCredito)
                        newArr2 = newArr2.concat(arrSuma)
                    }
                }
                log.debug({ title: 'newArr2', details: newArr2 });
                obtenLineasValidas(newArr2)
                return newArr2
            } catch (e) {
                log.error({ title: 'Error validateExists:', details: e });
                return []
            }
        }
        function obtenLineasValidas(newArr) {
            try {
                let objAgr = newArr.reduce((grupo, line) => {
                    log.debug({ title: 'line', details: line });

                    var lineStatus = line.status;
                    var lineIdCSV = line[Object.keys(line)[0]];
                    log.debug({ title: 'lineIdCSV', details: lineIdCSV });
                    if (!grupo[lineIdCSV]) {
                        grupo[lineIdCSV] = []
                    }
                    if (lineStatus === 'OK' || lineStatus === 'Se realizará el traslado a la nueva linea') {
                        grupo[lineIdCSV].push({
                            lineCSV: lineIdCSV || 'NA',
                            line: line.custpage_line_id,
                            TypeMov: line.tipo_de_movimiento,
                            amount: (line.tipo_de_movimiento === '+' ? line.monto : line.custpage_amount_available),
                            amount_consum: line.amount_consum,
                            amount_restante: line.amount_actualizado,
                            amount_original: line.amount_original,
                            amount_restado: line.amount_restado || 0,
                            budget: line.custom_budget_id_budget,
                            idBudgetCred: line.custpage_custom_budget_id,
                            idBudgetDeb: line.custpage_custom_budget_debito,
                            idSubsidiaria: line.custpage_subsidiary_id,
                            idDepartment: line.custpage_department_id,
                            idAccount: line.custpage_account_cont_id,
                            idPeriod: line.custpage_period_id,
                            idClass: line.custpage_class_id,
                            memo: line.memo_descripción
                        });
                    }
                    return grupo;
                }, {});

                log.debug({ title: 'objAgr', details: objAgr });
                // Usar filter para eliminar propiedades con arreglos vacíos
                objProcess = Object.keys(objAgr)
                    .filter(propiedad => !(Array.isArray(objAgr[propiedad]) && (objAgr[propiedad].length === 0 || objAgr[propiedad].length === 1)))
                    .reduce((obj, key) => {
                        obj[key] = objAgr[key];
                        return obj;
                    }, {});

                log.audit({ title: 'Objeto para generar los traslados:', details: objProcess });
            } catch (e) {
                log.error({ title: 'Error obtenLineasValidas:', details: e });
                objProcess = {}
            }
        }

        return { onRequest }

    });
