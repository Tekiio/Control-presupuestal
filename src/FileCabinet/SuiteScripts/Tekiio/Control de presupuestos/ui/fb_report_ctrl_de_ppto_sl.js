/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/**
* @name TKIO - Control Presupuestal - SL
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Interfaz para visualizar el reporte presupuestal
* @copyright Tekiio México 2022
*  
* Last modification  -> 04/08/2023
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> Registro en Netsuite <tkio_ctrl_de_ppto_sl>
*/
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/url', 'N/redirect', 'N/file', 'N/runtime'], (serverWidget, search, record, url, redirect, file, runtime) => {
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    var objExcel = {};
    var idFolderSave = ''
    const onRequest = (scriptContext) => {
        let request = scriptContext.request.method;
        log.audit({ title: 'scriptContext.request', details: scriptContext.request });
        log.audit({ title: 'request', details: request });
        creaPanel(scriptContext, serverWidget, search, request);
    }

    function creaPanel(scriptContext, serverWidget, search, method) {
        try {
            idFolderSave = runtime.getCurrentScript().getParameter({ name: 'custscript_fb_id_folder_to_save' })
            log.audit({ title: 'idFolderSave', details: idFolderSave });
            var form = serverWidget.createForm({ title: 'Reporte presupuestal', hideNavBar: false });
            let parametros = scriptContext.request.parameters
            log.audit({ title: 'Parametros originales', details: parametros });
            let objParametros = {
                custpage_company: parametros.custpage_company || '',
                custpage_period: parametros.custpage_period || '',
                custpage_budget_position: parametros.custpage_budget_position || '',
                custpage_account: parametros.custpage_account || '',
                custpage_cost_center: parametros.custpage_cost_center || '',

            }
            objParametros = (parametros.filtros ? JSON.parse(parametros.filtros) : objParametros)
            form.clientScriptModulePath = '../uievents/fb_report_ctrl_de_ppto_cs.js'
            log.audit({ title: 'Parametros', details: objParametros });
            // Se añaden los campos para filtros
            var company = form.addField({ id: 'custpage_company', label: 'Empresa', type: serverWidget.FieldType.MULTISELECT, source: record.Type.SUBSIDIARY });
            company.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
            var period = form.addField({ id: 'custpage_period', label: 'Período', type: serverWidget.FieldType.MULTISELECT, source: record.Type.ACCOUNTING_PERIOD });
            // period.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
            var budgetPosition = form.addField({ id: 'custpage_budget_position', label: 'Posición presupuestal', type: serverWidget.FieldType.MULTISELECT, source: 'customrecord_fb_pos_de_ppto_rd' });
            budgetPosition.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
            var account = form.addField({ id: 'custpage_account', label: 'Cuenta', type: serverWidget.FieldType.MULTISELECT, source: record.Type.ACCOUNT });
            account.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
            var costCenter = form.addField({ id: 'custpage_cost_center', label: 'Centro de costos', type: serverWidget.FieldType.MULTISELECT, source: record.Type.DEPARTMENT });
            costCenter.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
            var noResultsTotales = form.addField({ id: 'custpage_no_resultados', label: 'No. resultados para excel', type: serverWidget.FieldType.TEXT }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
            var noResultsProveedor = form.addField({ id: 'custpage_no_resultados_proveedor', label: 'No. resultados por proveedor', type: serverWidget.FieldType.TEXT }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            // Identifica si se va a mostrar informacion o no
            // [0], es el Form modificado con los valores por defecto
            // [1], es la condicion para efectuar la busqueda guardada
            // [2], es el filtro a usar para la busqueda guardada
            let objValidateParameters = validateDefaultValues(form, objParametros, method);
            form = (objParametros[1] ? objValidateParameters[0] : form);
            // Se añaden los botones principales
            form.addSubmitButton({ id: 'custpage_process', label: 'Filtrar' });
            // form.addButton({ id: 'custpage_filter', label: 'Filtrar', functionName: 'get_Results();' });

            var sublist = form.addSublist({ id: 'custpage_detail_list_gral', type: serverWidget.SublistType.LIST, label: 'General' });

            // Añade las columnas
            //sublist.addField({ id: 'custpage_id', label: 'Id', type: serverWidget.FieldType.TEXT })//.updateDisplayType({ displayType: 'hidden' });
            sublist.addField({ id: 'custpage_vendor', label: 'Proveedor', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_cost_center_list', label: 'Centro de costos', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_budget_position_list', label: 'Posicion presupuestal', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_budget_or', label: 'Budget', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_budget_line_or', label: 'Linea de presupuesto', type: serverWidget.FieldType.TEXT });
            sublist.addField({ id: 'custpage_budget_board', label: 'Budget board', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_budget_transfer', label: 'Budget Traslados', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_budget_adjust', label: 'Budget Ajustado', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_amount_in_process', label: 'En proceso de aprobacion', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_precommitted', label: 'Precomprometido', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_committed', label: 'Comprometido', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_eject', label: 'Ejecutado', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_available', label: 'Disponible', type: serverWidget.FieldType.CURRENCY });
            sublist.addField({ id: 'custpage_total_monto', label: 'Total', type: serverWidget.FieldType.CURRENCY });
            // sublist.addField({ id: 'custpage_window_details', label: 'Ver detalles', type: serverWidget.FieldType.TEXTAREA });

            if (objValidateParameters[1]) {
                // Genera columnas para obtener informacion de las transacciones relacionadas dentro del centro de costos
                let coumnasInfoSolped = [
                    search.createColumn({ name: "tranid", label: "Document Number" }),
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiary" }),
                    search.createColumn({ name: "subsidiarynohierarchy", label: "Subsidiary (no hierarchy)" }),
                    search.createColumn({ name: "account", label: "Account" }),
                    search.createColumn({ name: "custcol_fb_periodo_sublist", label: "Período" }),
                    search.createColumn({ name: "name", join: "account", label: "Name" }),
                    search.createColumn({ name: "number", join: "account", label: "Number" }),
                    search.createColumn({ name: "department", label: "Department" }),
                    search.createColumn({ name: "memo", label: "Memo" }),
                    search.createColumn({ name: "trandate", label: "Date" }),
                    // search.createColumn({ name: "custcol_ko_line_description", label: "Descripción " }),
                    // search.createColumn({ name: "description", label: "Descripción " }),
                    search.createColumn({ name: "purchasedescription", join: "item", label: "Descripción de la compra" }),
                    search.createColumn({ name: "type", label: "Type" }),
                    search.createColumn({ name: "custbody_fb_tipo_cambio_ctrl_ppto", label: "Tipo Cambio FB" }),
                    search.createColumn({ name: "custbody_fb_moneda__ctrl_ppto", label: "Moneda FB" }),
                    search.createColumn({ name: "memo", join: "applyingTransaction", label: "Memo" }),
                    search.createColumn({ name: "custbody_empleado_solicitud", label: "Empleado solicitud" }),
                    search.createColumn({ name: "tranid", label: "Document Number" }),
                    search.createColumn({ name: "custcol_imr_solicitante", label: "Solicitante" }),
                    search.createColumn({ name: "applyingtransaction", label: "Applying Transaction" }),
                    search.createColumn({ name: "item", label: "Item" }),
                    search.createColumn({ name: "custbody_imr_fe_liv_entity_type", join: "applyingTransaction", label: "Entity Type" }),
                    search.createColumn({ name: "amount", label: "Amount" }),
                    search.createColumn({ name: "custcol_fb_ctrl_presupuestal_sublist", label: "Control Presupuestal" }),
                    search.createColumn({ name: "custcol_fb_pos_presupuestal_sublist", label: "Pocision presupuestal" }),
                    search.createColumn({ name: "class", label: "Class" }),
                    search.createColumn({ name: "statusref", label: "Status" })
                ]
                let resultadosSolped = searchResultsBySavedSearch('transaction', objValidateParameters[2], coumnasInfoSolped);

                log.audit({ title: 'resultadosSolped', details: resultadosSolped });
                let idsPurchaseOrder = [];
                let idsBudget = [];
                resultadosSolped.forEach((line) => {
                    if (!idsPurchaseOrder.includes(line.applyingtransaction.value) && line.applyingtransaction.value !== '') {
                        idsPurchaseOrder.push(line.applyingtransaction.value);
                    }
                    if (!idsBudget.includes(line.custcol_fb_ctrl_presupuestal_sublist.value)) {
                        idsBudget.push(line.custcol_fb_ctrl_presupuestal_sublist.value);
                    }
                });
                // IDS para iniciar la busqueda general del la tabla a mostrar
                log.audit({ title: 'idsPurchaseOrder', details: idsPurchaseOrder });
                log.audit({ title: 'idsBudget', details: idsBudget });

                // Filtros columnas y resultados con el fin de encontrar el vendor a partir de los ids mostrados en la parte superior
                let filterPO = [
                    ["internalid", "anyof", idsPurchaseOrder],
                    'AND',
                    ["mainline", "is", "T"],

                ]
                let columnsPO = [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "entityid", join: "vendor", label: "ID" }),
                    search.createColumn({ name: "companyname", join: "vendor", label: "Company Name" }),
                    search.createColumn({ name: "statusref", label: "Status" }),
                    search.createColumn({ name: "amount", label: "Amount" }),
                ]
                let resultadosVendor = (idsPurchaseOrder.length > 0 ? searchResultsBySavedSearch('transaction', filterPO, columnsPO) : []);

                // Filtros, columnas y resultados para obtener info relacionada a los traspados
                objValidateParameters[3].push('AND', idsBudget)
                log.audit({ title: 'Filtros traspasos', details: objValidateParameters[3] });
                let columnasTraspasos = [
                    search.createColumn({ name: "amount", label: "Amount" }),
                    search.createColumn({ name: "department", label: "Department" }),
                    search.createColumn({ name: "class", label: "Class" }),
                    search.createColumn({ name: "account", label: "Account" }),
                    search.createColumn({ name: "custcol_imr_budget_period_", label: "Budget Period." })
                ]
                let resultadosTraspasos = []//searchResultsBySavedSearch('transaction', objValidateParameters[3], columnasTraspasos);
                log.audit({ title: 'resultadosTraspasos', details: resultadosTraspasos });

                let arrIdBudget = []
                idsBudget.forEach((id, index) => {
                    if (index === (idsBudget.length - 1)) {
                        arrIdBudget.push(["numbertext", "is", id])
                    } else {
                        arrIdBudget.push(["numbertext", "is", id], "OR")
                    }
                });
                let arrNameBudget = [];
                for (let i = 0; i < idsBudget.length; i++) {
                    if (i === 0) {
                        arrNameBudget.push(["custbody_imr_custom_budget_id", "is", idsBudget[i]])
                    } else {
                        arrNameBudget.push("OR", ["custbody_imr_custom_budget_id", "is", idsBudget[i]])
                    }
                }
                let trasladosMontos = (idsBudget.length > 0 ? obtainTrasladosByIdBudget(arrNameBudget) : []);
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
                let filtersBudget = [
                    ["type", "anyof", "Custom107"],
                    "AND",
                    ["mainline", "is", "F"],
                    "AND",
                    ["internalid", "anyof", idsBudget],
                ]

                let columnsBudget = [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "tranid", label: "Document Number" }),
                    search.createColumn({ name: "account", label: "Account" }),
                    search.createColumn({ name: "department", label: "Department" }),
                    search.createColumn({ name: "class", label: "Class" }),
                    search.createColumn({ name: "custcol_bm_line_bdg_period", label: "Budget Period" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiary" }),
                    search.createColumn({ name: "subsidiarynohierarchy", label: "Subsidiary (no hierarchy)" }),
                    search.createColumn({ name: "internalid", join: "subsidiary", label: "Internal ID" }),
                    search.createColumn({ name: "custcol_bm_line_bdg_period", label: "Budget Period" }),
                    search.createColumn({ name: "amount", label: "Amount" }),
                    search.createColumn({ name: "custcol_imr_presu_consumido", label: "Presupeusto ejecutado" }),
                    search.createColumn({ name: "custcol_imr_presupuesto_consumido", label: "IMR - PRESUPUESTO CONSUMIDO" }),
                    search.createColumn({ name: "custcol_fb_comprometido_monto", label: "Comprometido" }),
                    search.createColumn({ name: "custcol_fb_pre_comprometido_monto", label: "Pre-Comprometido" }),
                    search.createColumn({ name: "custcol_imr_presu_restante", label: "Prespuesto restante" }),
                    search.createColumn({ name: "line", label: "Line ID" })

                ]
                let resultadosBudget = (idsBudget.length > 0 ? searchResultsBySavedSearch('transaction', filtersBudget, columnsBudget) : []);

                log.audit({ title: 'resultadosBudget', details: resultadosBudget });
                // Agrupando los datos por proveedor
                let vendorGroup = {};
                const grupos = resultadosSolped.reduce((acumulador, elemento) => {
                    let nameVendor = resultadosVendor.find(function (valuePO) {
                        return (parseInt(valuePO.internalid.value) === parseInt(elemento.applyingtransaction.value));
                    }) || null;
                    if (nameVendor) {
                        const clave = `${nameVendor.vendor.entityid}-${elemento.department.value}-${elemento.custcol_fb_pos_presupuestal_sublist.value}-${elemento.custcol_fb_ctrl_presupuestal_sublist.value}-${elemento.class.value}`;
                        const budget = resultadosBudget.find(function (infoBudget) {
                            return (
                                parseInt(infoBudget.internalid.value) === parseInt(elemento.custcol_fb_ctrl_presupuestal_sublist.value) &&
                                parseInt(infoBudget.department.value) === parseInt(elemento.department.value) &&
                                parseInt(infoBudget.custcol_bm_line_bdg_period.value) === parseInt(elemento.custcol_fb_periodo_sublist.value) &&
                                parseInt(infoBudget.account.value) === parseInt(elemento.account.value) &&
                                parseInt(infoBudget.class.value) === parseInt(elemento.class.value));
                        }) || null;
                        if (!acumulador[clave]) {
                            acumulador[clave] = [];
                        }
                        acumulador[clave].push({ solPed: elemento, purchOr: nameVendor, budg: budget });
                        return acumulador;
                    } else {
                        const clave = `_In Process_-${elemento.department.value}-${elemento.custcol_fb_pos_presupuestal_sublist.value}-${elemento.custcol_fb_ctrl_presupuestal_sublist.value}-${elemento.class.value}`;
                        const budget = resultadosBudget.find(function (infoBudget) {
                            return (
                                parseInt(infoBudget.internalid.value) === parseInt(elemento.custcol_fb_ctrl_presupuestal_sublist.value) &&
                                parseInt(infoBudget.department.value) === parseInt(elemento.department.value) &&
                                parseInt(infoBudget.custcol_bm_line_bdg_period.value) === parseInt(elemento.custcol_fb_periodo_sublist.value) &&
                                parseInt(infoBudget.account.value) === parseInt(elemento.account.value) &&
                                parseInt(infoBudget.class.value) === parseInt(elemento.class.value));
                        }) || null;
                        if (!acumulador[clave]) {
                            acumulador[clave] = [];
                        }
                        let unnAssignedVendor = { vendor: { "entityid": "In", "companyname": "Process" }, "statusref": { "text": "In process", "value": "In process" }, "amount": "0" }
                        acumulador[clave].push({ solPed: elemento, purchOr: unnAssignedVendor, budg: budget });
                        return acumulador;
                    }
                }, {});
                log.audit({ title: 'Agrupador de busqueda general:', details: vendorGroup });
                // Recordar que la key, al momento de usarse debera tener lo siguiente:
                // Primera posicion tendra el nombre del proveedor
                // Segunda posicion tendra el id del departamento
                // Tercer posicion tendra el id del de la posicion presupuestal
                // Cuarta posicion tendra el id del del budget usado
                log.audit({ title: 'grupos', details: grupos });
                log.audit({ title: 'resultadosBudget', details: resultadosBudget });
                let arrGrouped = createRelacionBudget(sublist, grupos, resultadosSolped, resultadosVendor, resultadosTraspasos, agrupadorTraslados);
                noResultsTotales.defaultValue = resultadosSolped.length
                noResultsProveedor.defaultValue = arrGrouped[1]
                sublist = arrGrouped[0]

                switch (parametros.operador) {
                    case 'exportar':
                        let excelGenerado = generateExcel(objExcel);
                        if (excelGenerado) {
                            var urlFile = getFileURL(excelGenerado);
                            if (urlFile) {
                                redirect.redirect({
                                    url: urlFile
                                });
                            }
                        }
                        break;
                    case null:
                        break;
                }
                log.audit({ title: 'Budget resultados:', details: resultadosSolped });
            }
            scriptContext.response.writePage(form);
        } catch (e) {
            log.error({ title: 'Error creaPanel:', details: e });
        }
    }
    function obtainTrasladosByIdBudget(ids) {
        try {
            log.audit({ title: 'ids', details: ids });
            let filtros = [
                ["mainline", "is", "F"], "AND",
                ["type", "anyof", "Custom116"], "AND"
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
                        amount_total: result.getValue({ name: "amount" }) || '0',
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
    function generateExcel(lineasNuevas) {
        try {
            var json = lineasNuevas;
            var fields = Object.keys(json[0]);
            var replacer = function (key, value) {
                return value === null ? '' : value
            };
            var csv = json.map(function (row) {
                return fields.map(function (fieldName) {
                    return JSON.stringify(row[fieldName], replacer)
                }).join(',')
            });
            csv.unshift(fields.join(','));
            csv = csv.join('\r\n');
            var fileObj = file.create({
                name: 'Reporte presupuestal.csv',
                fileType: file.Type.CSV,
                // encoding: file.Encoding.WINDOWS_1252,
                encoding: file.Encoding.UTF_8,
                contents: csv
            });
            // fileObj.name = 'Reporte presupuestal.xlsx'
            fileObj.folder = idFolderSave;
            var fileId = fileObj.save();
            return fileId;
        } catch (e) {
            log.error('Error on generateExcel', e);
        }
    }
    function getFileURL(fileId) {
        try {
            var fileObj = file.load({
                id: fileId
            });

            var fileURL = fileObj.url;
            var scheme = 'https://';
            var host = url.resolveDomain({
                hostType: url.HostType.APPLICATION
            });

            var urlFinal = scheme + host + fileURL;
            return urlFinal;
        } catch (e) {
            log.error('Error on getFileURL', e);
        }
    }
    function createRelacionBudget(sublist, grupos, resultados, resultadosVendor, agrupadorTraslados) {
        try {
            let noResultsProveedor = 0
            if (resultados.length > 0) {
                let arrToList = [];
                let arrToExport = [];
                // Se mapean los datos para que sean colocados dentro de la tabla establecida de un inicio y para el Excel
                resultados.forEach(infoLine => {
                    let nameVendor = resultadosVendor.find(function (valuePO) {
                        return (parseInt(valuePO.internalid.value) === parseInt(infoLine.applyingtransaction.value));
                    }) || null;
                    // log.emergency({ title: 'nameVendor', details: { nameVendor, idPO: resultadosVendor[0].internalid.value, idPOinSOLPED: infoLine.applyingtransaction } });
                    var notaFilterTransaction = infoLine.memo || '';
                    notaFilterTransaction = notaFilterTransaction.split('"').join('')
                    notaFilterTransaction = notaFilterTransaction.split('\n').join('')
                    var notaFilter = infoLine.applyingTransaction.memo || '';
                    notaFilter = notaFilter.split('"').join('')
                    notaFilter = notaFilter.split('\n').join('')
                    // log.emergency({
                    //     title: 'Detalles', details: {
                    //         'Subsidiary name': infoLine.subsidiarynohierarchy.text || '',
                    //         'Accounting Book Name': infoLine.account.name || '',
                    //         'Month': (infoLine.custcol_fb_periodo_sublist.text).split(':')[2] || 'NA',
                    //         'Account Number /n Name Account': infoLine.account.text || '',
                    //         'Department': infoLine.department.text || '',
                    //         'Vendor Name': (nameVendor ? nameVendor.vendor.entityid + ' ' + nameVendor.vendor.companyname : '_Empty_'),
                    //         'Transaction Memo': notaFilterTransaction || '',
                    //         'Transaction Date': infoLine.trandate || '',
                    //         'Transaction Type': infoLine.type.text || '',
                    //         'Memo': infoLine.applyingTransaction.memo || '',
                    //         // 'Descripción': infoLine.custcol_ko_line_description,
                    //         // 'Descripción': infoLine.description,
                    //         'Solicitante': infoLine.custbody_empleado_solicitud.text || '',
                    //         '# Solped': infoLine.tranid || 'NA',
                    //         'Importe': infoLine.amount || '',
                    //         'Tipo de cambio': infoLine.custbody_fb_tipo_cambio_ctrl_ppto || 'NA',
                    //         'Moneda': infoLine.custbody_fb_moneda__ctrl_ppto.text || 'NA',
                    //         '# OC': infoLine.applyingtransaction.text || '',
                    //         'Material': infoLine.item.text || ''
                    //     }
                    // });

                    arrToExport.push({
                        'Subsidiary name': infoLine.subsidiarynohierarchy.text || '',
                        'Accounting Book Name': infoLine.account.name || '',
                        'Month': (infoLine.custcol_fb_periodo_sublist.text).split(':')[2] || 'NA',
                        'Account Number /n Name Account': infoLine.account.text || '',
                        'Department': infoLine.department.text || '',
                        'Vendor Name': (nameVendor ? nameVendor.vendor.entityid + ' ' + nameVendor.vendor.companyname : '_Empty_'),
                        'Transaction Memo': notaFilterTransaction || '',
                        'Transaction Date': infoLine.trandate || '',
                        'Transaction Type': infoLine.type.text || '',
                        'Memo': notaFilter || '',
                        // 'Descripción': infoLine.custcol_ko_line_description,
                        // 'Descripción': infoLine.description,
                        'Solicitante': infoLine.custbody_empleado_solicitud.text || '',
                        '# Solped': infoLine.tranid || 'NA',
                        'Importe': infoLine.amount || '',
                        'Tipo de cambio': infoLine.custbody_fb_tipo_cambio_ctrl_ppto || 'NA',
                        'Moneda': infoLine.custbody_fb_moneda__ctrl_ppto.text || 'NA',
                        '# OC': infoLine.applyingtransaction.text || '',
                        'Material': infoLine.item.text || ''
                    });
                });
                log.audit({ title: 'arrToExport', details: arrToExport });
                objExcel = arrToExport;
                // Se mapean los datos para ser colocados dentro de la tabla principal
                for (line in grupos) {
                    let infoLine = grupos[line];

                    let montoPendientePorAprobar = infoLine.reduce((acumulador, linea) => {
                        // Sumando cantidad pendiente por aprobar de las solped
                        // log.audit({ title: 'linea.solPed', details: linea.solPed });
                        // log.audit({ title: 'linea.purchOr', details: linea.purchOr });
                        if (linea.solPed.statusref.value === 'pendingSupApproval') {// || linea.solPed.statusref.value === 'pendingOrder') {
                            return acumulador + parseFloat(linea.solPed.amount);
                        } else if (linea.purchOr.statusref.value === 'pendingSupApproval') {
                            return acumulador + parseFloat(linea.purchOr.amount);
                        } else {
                            return acumulador;
                        }
                    }, 0) || 0;
                    // log.debug({ title: 'infoLine', details: infoLine });
                    let vendorName = infoLine[0].purchOr.vendor.entityid + ' ' + infoLine[0].purchOr.vendor.companyname
                    let departament = infoLine[0].solPed.department.text || ''
                    let posicionPptal = infoLine[0].solPed.custcol_fb_pos_presupuestal_sublist.text || ' '
                    let budgetOR = 'Custom Budget # ' + infoLine[0].budg?.tranid
                    let lineaBudget = infoLine[0].budg?.line || '-';
                    // log.audit({ title: 'agrupadorTraslados', details: agrupadorTraslados });
                    let montoOriginal = (infoLine[0].budg?.amount ? parseFloat(infoLine[0].budg?.amount) : 0)
                    let montoTraslados = (agrupadorTraslados[infoLine[0].budg?.internalid.value] ? (agrupadorTraslados[infoLine[0].budg?.internalid.value][infoLine[0].budg?.line]) ? agrupadorTraslados[infoLine[0].budg?.internalid.value][infoLine[0].budg?.line] : 0 : 0);
                    let montoPreComprometido = (infoLine[0].budg?.custcol_fb_pre_comprometido_monto ? parseFloat(infoLine[0].budg?.custcol_fb_pre_comprometido_monto) : 0);
                    let montoComprometido = (infoLine[0].budg?.custcol_fb_comprometido_monto ? parseFloat(infoLine[0].budg?.custcol_fb_comprometido_monto) : 0);
                    let montoEjecutado = (infoLine[0].budg?.custcol_imr_presu_consumido ? parseFloat(infoLine[0].budg?.custcol_imr_presu_consumido) : 0);
                    let montoDisponible = (infoLine[0].budg?.custcol_imr_presu_restante ? parseFloat(infoLine[0].budg?.custcol_imr_presu_restante) : 0);
                    let montoTotal = montoOriginal + montoPreComprometido + montoComprometido + montoEjecutado + montoDisponible + montoPendientePorAprobar
                    arrToList.push({
                        custpage_vendor: vendorName,
                        custpage_cost_center_list: departament,
                        custpage_budget_position_list: posicionPptal,
                        custpage_budget_or: budgetOR,
                        custpage_budget_line_or: lineaBudget,
                        custpage_budget_board: montoOriginal,
                        custpage_budget_transfer: montoTraslados,
                        custpage_budget_adjust: montoOriginal,
                        custpage_amount_in_process: montoPendientePorAprobar,
                        custpage_precommitted: montoPreComprometido,
                        custpage_committed: montoComprometido,
                        custpage_eject: montoEjecutado,
                        custpage_available: montoDisponible,
                        custpage_total_monto: montoTotal
                    });
                }
                noResultsProveedor = Object.keys(grupos).length;
                sublist.addButton({ id: 'custpage_download', label: 'Descargar Excel', functionName: 'descargarPdf' });
                arrToList.forEach((linea, index) => {
                    for (key in linea) {
                        // if (key === 'custpage_cost_center_list') {
                        //     var stagingLink = url.resolveRecord({ recordType: 'customtransaction_bm_budget_transaction', recordId: linea['custpage_id'], isEditMode: false });
                        //     sublist.setSublistValue({ id: 'custpage_cost_center_list', line: index, value: "<a href=" + stagingLink + ">" + linea[key] + "</a>" });
                        //     // sublist.setSublistValue({ id: 'custpage_cost_center_list', line: index, value: "<script>alert('holi')</script><a href=" + stagingLink + ">" + linea[key] + "</a>" });
                        // } else {
                        // }
                        sublist.setSublistValue({ id: key, line: index, value: linea[key] });
                    }
                });
            }
            return [sublist, noResultsProveedor];
        } catch (e) {
            log.error({ title: 'Error createRelacionBudget:', details: e });
            return [sublist, 0];
        }
    }
    function validateDefaultValues(form, objParametros, method) {
        try {
            // log.debug({title: 'ID Empresa', details: objParametros.custpage_company.split('').map(Number)});
            let condicionBusqueda = false;
            let filtrosSolPed = [
                // ["internalid", "anyof", '143938'],
                // 'AND',
                ["mainline", "is", "F"],
                "AND",
                ["type", "anyof", "PurchReq"],
                "AND",
                ["custcol_fb_ctrl_presupuestal_sublist", "noneof", "@NONE@"]
            ];
            let filtrosTraspasos = [
                ["type", "anyof", "Custom116"],
                "AND",
                ["mainline", "is", "F"]
            ]
            // se crean los filtros necesarios para armar la tabla de visualizacion y el excel de descarga
            if (objParametros.custpage_company !== '' && objParametros.custpage_company[0] !== '') {
                var field_custpage_company = form.getField({ id: 'custpage_company' });
                field_custpage_company.defaultValue = objParametros.custpage_company;
                condicionBusqueda = true;
                if (method === 'POST') {
                    filtrosSolPed.push("AND", ["subsidiary", "anyof", objParametros.custpage_company.split('').map(Number)])
                } else {
                    filtrosSolPed.push("AND", ["subsidiary", "anyof", objParametros.custpage_company])
                }
            }
            if (objParametros.custpage_period !== '' && objParametros.custpage_period[0] !== '') {
                var field_custpage_period = form.getField({ id: 'custpage_period' });
                field_custpage_period.defaultValue = objParametros.custpage_period;
                condicionBusqueda = true;
                // filtrosSolPed.push("AND", ["custbody_bm_budgetperiod", "anyof", objParametros.custpage_period])
                if (method === 'POST') {
                    filtrosSolPed.push("AND", ["custcol_fb_periodo_sublist", "anyof", objParametros.custpage_period.split('').map(Number)])
                } else {
                    filtrosSolPed.push("AND", ["custcol_fb_periodo_sublist", "anyof", objParametros.custpage_period])
                }
            } else {
                var field_custpage_period = form.getField({ id: 'custpage_period' });
                field_custpage_period.defaultValue = '';
            }
            if (objParametros.custpage_budget_position !== '' && objParametros.custpage_budget_position[0] !== '') {
                var field_custpage_budget_position = form.getField({ id: 'custpage_budget_position' });
                field_custpage_budget_position.defaultValue = objParametros.custpage_budget_position;
                condicionBusqueda = true;
                if (method === 'POST') {
                    filtrosSolPed.push("AND", ["custcol_fb_pos_presupuestal_sublist", "anyof", objParametros.custpage_budget_position.split('').map(Number)])
                } else {
                    filtrosSolPed.push("AND", ["custcol_fb_pos_presupuestal_sublist", "anyof", objParametros.custpage_budget_position])
                }
            }
            if (objParametros.custpage_account !== '' && objParametros.custpage_account[0] !== '') {
                var field_custpage_account = form.getField({ id: 'custpage_account' });
                field_custpage_account.defaultValue = objParametros.custpage_account;
                condicionBusqueda = true;
                if (method === 'POST') {
                    filtrosSolPed.push("AND", ["account", "anyof", objParametros.custpage_account.split('').map(Number)])
                } else {
                    filtrosSolPed.push("AND", ["account", "anyof", objParametros.custpage_account])
                }
            }
            if (objParametros.custpage_cost_center !== '' && objParametros.custpage_cost_center[0] !== '') {
                var field_custpage_cost_center = form.getField({ id: 'custpage_cost_center' });
                field_custpage_cost_center.defaultValue = objParametros.custpage_cost_center;
                condicionBusqueda = true;
                if (method === 'POST') {
                    filtrosSolPed.push("AND", ["department", "anyof", objParametros.custpage_cost_center.split('').map(Number)])
                } else {
                    filtrosSolPed.push("AND", ["department", "anyof", objParametros.custpage_cost_center])
                }
            }
            log.debug({ title: 'filtrosSolPed', details: filtrosSolPed });
            log.debug({ title: 'filtrosTraspasos', details: filtrosTraspasos });
            return [form, condicionBusqueda, filtrosSolPed, filtrosTraspasos];
        } catch (e) {
            log.error({ title: 'Error validateDefaultValues:', details: e });
            return [form, false, [], []];
        }
    }
    function searchResultsBySavedSearch(typeSearch, filters, columns) {
        try {
            log.audit({ title: 'Objeto de busqueda', details: { typeSearch, filters, columns } });
            var searchObj = search.create({
                type: typeSearch,
                filters: filters,
                columns: columns
            });
            var searchResultCount = searchObj.runPaged().count;
            log.debug(("Resultados de la busqueda de: " + typeSearch), searchResultCount);
            // Genera objeto auxiliar para la creacion del arreglo de objetos
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
            log.audit({ title: 'arrDataSearch', details: arrDataSearch });
            /*
            searchObj.id="customsearch_fb_search_"+typeSearch;
            searchObj.title="FB - resultados de  "+typeSearch;
            var newSearchId = searchObj.save();
            */
            return arrDataSearch;
        } catch (e) {
            log.error({ title: 'Error searchResultsBySavedSearch:', details: e });
            return [];
        }
    }
    return { onRequest }

});
