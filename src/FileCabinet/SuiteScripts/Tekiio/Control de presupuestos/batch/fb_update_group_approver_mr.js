/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/**
* @name FB - Update group approver - MR
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Script que genera los grupos de aprobacion y los asigna al departamento
* @copyright Tekiio México 2022
* 
* Konfio       -> Konfio
* Last modification  -> 13/09/2023
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> FB - Update group approver - MR <_fb_update_group_approver_mr>
*/
define(['N/log', 'N/record', 'N/runtime', 'N/file', 'N/search', 'N/task'],

    (log, record, runtime, file, search, task) => {
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

                var scriptObj = runtime.getCurrentScript();
                let idRecordTracking = scriptObj.getParameter({ name: 'custscript_fb_tracking_upload_group_appr' });
                let status = false;
                if (idRecordTracking) {
                    // let file = file.load({ id:  });
                    var fieldLookUp = search.lookupFields({ type: 'customrecord_fb_config_group_approver', id: idRecordTracking, columns: ['custrecord_fb_upload_file_csv', 'custrecord_fb_success_complete'] });
                    log.audit({ title: 'fieldLookUp', details: fieldLookUp });
                    let idFileCSV = fieldLookUp.custrecord_fb_upload_file_csv[0].value;
                    let nameFileCSV = fieldLookUp.custrecord_fb_upload_file_csv[0].text;
                    let status = fieldLookUp.custrecord_fb_success_complete;
                    log.audit({ title: 'idFileCSV', details: idFileCSV });
                    log.audit({ title: 'status', details: status });
                    if (!status) {
                        if (idFileCSV && nameFileCSV.includes('.csv')) {

                            let fileCSV = file.load({ id: idFileCSV });
                            let contenido = fileCSV.getContents();
                            log.audit({ title: 'file', details: contenido });
                            let dataByCSV = getLinesByCSV(fileCSV);
                            let arrGroupedByDepartment = groupByDepartment(dataByCSV);
                            log.audit({ title: 'dataByCSV', details: dataByCSV });
                            record.submitFields({
                                type: 'customrecord_fb_config_group_approver',
                                id: idRecordTracking,
                                values: {
                                    custrecord_fb_details_ejecut: '',
                                    custrecord_fb_in_process_update:true
                                }
                            });
                            log.audit({ title: 'Entrando al Map', details: true });
                            return arrGroupedByDepartment;
                        } else {
                            log.error({ title: 'No se encontro el Id del archivo de actualizacion', details: "Debe cargar su archivo de tipo CSV para la actualizacion." });
                            record.submitFields({
                                type: 'customrecord_fb_config_group_approver',
                                id: idRecordTracking,
                                values: {
                                    custrecord_fb_details_ejecut: 'Debe cargar su archivo de tipo CSV para la actualizacion.'
                                }
                            });
                        }
                    } else {
                        log.error({ title: 'Este registro ya fue procesado', details: "Debe de generar su propio registro de seguimiento" });
                    }
                }
                else {
                    log.error({ title: 'No se encuentra el id de registro de seguimiento:', details: 'Generar un registro de seguimiento para actualizar la informacion.' });
                }
            } catch (e) {
                log.error({ title: 'Error getInputData:', details: e });
            }
        }
        function getLinesByCSV(archivo) {
            try {
                let arrKey = [];
                let condition = true;
                let arrLineas = [];
                // Se obtienen todas las lineas y se iteran
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
                            newKey = newKey.split(' ').join('');
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
        function groupByDepartment(dataByCSV) {
            try {
                let arrEmail = [];
                let limitApprover = 0;
                let arrGrouped = dataByCSV.reduce((acc, line) => {
                    // Se establece el id del departamento para agruparlos de acuerdo a este
                    const key = line.departamento;
                    if (!acc[key]) {
                        acc[key] = []
                    }
                    arrEmail.push(line.aprobador);
                    acc[key].push(line);
                    return acc;
                }, {});
                log.audit({ title: 'arrGrouped', details: arrGrouped });
                let arrDepts = Object.keys(arrGrouped);
                // Se crean los filtros para la busqueda del departamento
                let filtersSearchDepartments = [];
                let columnsSearchDepartments = [
                    search.createColumn({ name: "custrecord_fb_dept_group_approve", label: "Grupo de aprobación asignado" }),
                    search.createColumn({ name: "name", label: "Name" }),
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ];
                arrDepts.forEach((dept, index) => {
                    if (index === (arrDepts.length - 1)) {
                        filtersSearchDepartments.push(["name", "startswith", dept]);
                    } else {
                        filtersSearchDepartments.push(["name", "startswith", dept], "OR",)
                    }
                });

                let resultsDept = searchResultsBySavedSearch('department', filtersSearchDepartments, columnsSearchDepartments);

                // Se crean los filtros para la busqueda de los empleados
                let filtersSearchEmployee = [];
                let columnsSearchEmployee = [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "email", label: "Email" })
                ];
                arrEmail.forEach((email, index) => {
                    if (index === (arrEmail.length - 1)) {
                        filtersSearchEmployee.push(["email", "contains", email]);
                    } else {
                        filtersSearchEmployee.push(["email", "contains", email], "OR",)
                    }
                });
                let resultsEmployee = searchResultsBySavedSearch('employee', filtersSearchEmployee, columnsSearchEmployee);

                log.audit({ title: 'Datos de las busquedas:', details: { resultsEmployee, resultsDept } });

                for (dep in arrGrouped) {
                    // Con esto se verifica la existencia del departamento y el aprobador, en caso de que ninguno de los dos coincidan no se colocara el id del empleado ni el departamento
                    arrGrouped[dep].map((approver, index) => {
                        let aprobador = resultsEmployee.find((empleado) => empleado.email === approver.aprobador);
                        let departamento = resultsDept.find((department) => department.name === dep);
                        if (aprobador && departamento) {
                            log.audit({ title: 'Datos encontrados:', details: { aprobador, departamento } });
                            approver.employeeId = aprobador.internalid.value
                            approver.departmentId = departamento.internalid.value
                        }
                    });
                    // Verifica y obtiene la cantidad de aprobadores maxima de cada departamento
                    limitApprover = (limitApprover > arrGrouped[dep].length ? limitApprover : arrGrouped[dep].length);

                    // Verifica la existencia del id del empleado, si no existe se descarta la actualizacion del departamento
                    // Si existe se ordena del que tenga menor a mayor monto
                    let verificaTodos = arrGrouped[dep].find((aprobadorPib) => !aprobadorPib.hasOwnProperty('employeeId'));
                    if (verificaTodos) {
                        arrGrouped[dep] = [];
                    } else {
                        let aprobadores = arrGrouped[dep];
                        let aprobadoresOrdenados = aprobadores.sort((a, b) => parseFloat(a.monto) - parseFloat(b.monto));
                        arrGrouped[dep] = aprobadoresOrdenados;
                    }
                }
                log.audit({ title: 'Aprobadores a generar:', details: arrGrouped });
                let noExisteSuficientes = obtainLimitApprover(limitApprover);
                log.audit({ title: 'Es necesario generar aprobadores', details: noExisteSuficientes });
                if (noExisteSuficientes.cond && noExisteSuficientes.hasOwnProperty('no')) {
                    addNewApprovalList(limitApprover, noExisteSuficientes);
                }
                return arrGrouped;
            } catch (e) {
                log.error({ title: 'Error groupByDepartment:', details: e });
                return {};
            }
        }
        function addNewApprovalList(limit, noExisteSuficientes) {
            try {
                log.audit({ title: 'Entrando a funcion para la creacion de nuevo RD a nivel lista de aprobadores', details: { limit, noExisteSuficientes } });

                for (let index = (noExisteSuficientes.no + 1); index <= limit; index++) {
                    log.audit({ title: 'index', details: index });
                    let approverList = record.create({ type: "customlist_fb_list_posicion_approve", isDynamic: true });
                    approverList.setValue({ fieldId: 'name', value: `Aprobador ${index}` });
                    approverList.save({ enableSourcing: true, ignoreMandatoryFields: true });
                }
            } catch (e) {
                log.error({ title: 'Error addNewApprovalList:', details: e });
            }
        }
        function obtainLimitApprover(limit) {
            try {
                var customlist_fb_list_posicion_approveSearchObj = search.create({
                    type: "customlist_fb_list_posicion_approve",
                    filters: [],
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
                log.audit({ title: 'Datos:', details: { limit, countFind } });
                return (countFind >= limit ? { cond: false, no: countFind } : { cond: true, no: countFind })
            } catch (e) {
                log.error({ title: 'Error obtainLimitApprover:', details: e });
                return { cond: false };
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
                let keyData = mapContext.key;
                let valueData = JSON.parse(mapContext.value);
                log.audit({ title: 'keyData', details: keyData });
                log.audit({ title: 'valueData', details: valueData });
                log.audit({ title: 'Longitud valueData', details: valueData.length });
                if (valueData.length !== 0) {
                    var idGrupoAprobacion = search.lookupFields({ type: 'department', id: valueData[0].departmentId, columns: ['custrecord_fb_dept_group_approve'] }) || null;
                    log.audit({ title: 'idGrupoAprobacion', details: idGrupoAprobacion });
                    if (idGrupoAprobacion.custrecord_fb_dept_group_approve.length > 0) {
                        let newName = 'Grupo de aprobacion '
                        let nameGroup = idGrupoAprobacion.custrecord_fb_dept_group_approve[0].text
                        nameGroup = nameGroup.replaceAll('Grupo de aprobacion ', '')
                        nameGroup = nameGroup.replaceAll(` - ${keyData}`, '')
                        if (!isNaN(nameGroup)) {
                            let newNum = (parseInt(nameGroup) + 1)
                            newName = `${newName}${newNum} - ${keyData}`
                        } else {
                            newName = `${newName}generico - ${keyData}`

                        }
                        log.audit({ title: 'Nuevo Nombre', details: newName });
                        let grupoAprobacion = record.create({ type: "customrecord_fb_group_approver_rd", isDynamic: true })
                        grupoAprobacion.setValue({ fieldId: 'name', value: newName });
                        grupoAprobacion.setValue({ fieldId: 'custrecord_fb_department_group', value: valueData[0].departmentId });
                        grupoAprobacion.setValue({ fieldId: 'custrecord_fb_detail_approver', value: ('Grupo de aprobación enfocado para las SolPed del departamento ' + keyData) });
                        var grupoId = grupoAprobacion.save({ enableSourcing: true, ignoreMandatoryFields: true });
                        // var grupoId = 1
                        log.audit({ title: 'ID grupo generado CONSECUTIVO', details: grupoId });
                        mapContext.write({
                            key: grupoId,
                            value: valueData
                        });
                    } else {
                        let newName = 'Grupo de aprobacion 1 - ' + keyData;
                        log.audit({ title: 'Nuevo Nombre', details: newName });
                        let grupoAprobacion = record.create({ type: "customrecord_fb_group_approver_rd", isDynamic: true })
                        grupoAprobacion.setValue({ fieldId: 'name', value: newName });
                        grupoAprobacion.setValue({ fieldId: 'custrecord_fb_department_group', value: valueData[0].departmentId });
                        grupoAprobacion.setValue({ fieldId: 'custrecord_fb_detail_approver', value: ('Grupo de aprobación enfocado para las SolPed del departamento ' + keyData) });
                        var grupoId = grupoAprobacion.save({ enableSourcing: true, ignoreMandatoryFields: true });
                        // var grupoId = 1
                        log.audit({ title: 'ID grupo generado GENERICO:', details: grupoId });
                        mapContext.write({
                            key: grupoId,
                            value: valueData
                        });
                    }
                }
                else {

                    var scriptObj = runtime.getCurrentScript();
                    let idRecordTracking = scriptObj.getParameter({ name: 'custscript_fb_tracking_upload_group_appr' });
                    log.audit({ title: 'idRecordTracking', details: idRecordTracking });
                    let registroDeSeguimiento = record.load({ type: 'customrecord_fb_config_group_approver', id: idRecordTracking, isDynamic: true });
                    let custrecord_fb_details_ejecut = registroDeSeguimiento.getValue({ fieldId: 'custrecord_fb_details_ejecut' }) || '';
                    if (custrecord_fb_details_ejecut === '') {

                        custrecord_fb_details_ejecut = `Revise su archivo CSV, los siguiente departamentos no pudieron ser actualizados: ${keyData}`
                    } else {
                        custrecord_fb_details_ejecut = `${custrecord_fb_details_ejecut}, ${keyData}`
                    }
                    record.submitFields({
                        type: 'customrecord_fb_config_group_approver',
                        id: idRecordTracking,
                        values: {
                            custrecord_fb_details_ejecut: custrecord_fb_details_ejecut
                        }
                    });
                    mapContext.write({
                        key: -1,
                        value: []
                    });
                }
            } catch (e) {
                log.error({ title: 'Error map:', details: e });
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
                let idGroup = reduceContext.key;
                let arrAprobadores = JSON.parse(reduceContext.values[0]);
                log.audit({ title: 'idGroup', details: idGroup });
                log.audit({ title: 'arrAprobadores', details: arrAprobadores });
                if (arrAprobadores.length > 0 && idGroup !== -1) {

                    //Se generan los aprobadores para el grupo de aprobación
                    arrAprobadores.forEach((approver, index) => {
                        let numApp = (index + 1);
                        log.audit({ title: 'Datos:', details: { approver: approver, index: numApp } });
                        let aprobadorPib = record.create({ type: "customrecord_fb_entity_approver", isDynamic: true })
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_posicion_approve', value: numApp });
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_id_group_approver', value: idGroup });
                        aprobadorPib.setValue({ fieldId: 'name', value: (`Aprobador ${numApp} - ${approver.departamento}`) });
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_employee_approve', value: approver.employeeId });
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_departamento_approve', value: approver.departmentId });
                        aprobadorPib.setValue({ fieldId: 'custrecord_fb_amount_approve', value: parseFloat(approver.monto) });
                        log.audit({ title: 'aprobadorPib', details: aprobadorPib });
                        var aprobadorId = aprobadorPib.save({ enableSourcing: true, ignoreMandatoryFields: true });
                    })
                    record.submitFields({
                        type: 'department',
                        id: arrAprobadores[0].departmentId,
                        values: {
                            custrecord_fb_dept_group_approve: idGroup
                        }
                    });
                    reduceContext.write({
                        key: 1,
                        value: arrAprobadores
                    })
                }
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
            try {


                var scriptObj = runtime.getCurrentScript();
                let idRecordTracking = scriptObj.getParameter({ name: 'custscript_fb_tracking_upload_group_appr' });
                let registroDeSeguimiento = record.load({ type: 'customrecord_fb_config_group_approver', id: idRecordTracking, isDynamic: true });
                let custrecord_fb_details_ejecut = registroDeSeguimiento.getValue({ fieldId: 'custrecord_fb_details_ejecut' }) || '';
                custrecord_fb_details_ejecut = (custrecord_fb_details_ejecut===''?'Se completo la actualizacion con exito.':custrecord_fb_details_ejecut)
                record.submitFields({
                    type: 'customrecord_fb_config_group_approver',
                    id: idRecordTracking,
                    values: {
                        custrecord_fb_success_complete: true,
                        custrecord_fb_details_ejecut: custrecord_fb_details_ejecut,
                        custrecord_fb_in_process_update:false
                    }
                });
                summaryContext.output.iterator().each(function (key, value) {
                    log.debug({ title: 'key', details: key });
                    log.debug({ title: 'value', details: value });
                });
            } catch (e) {
                log.error({ title: 'Error summarize:', details: e });
            }

        }

        return { getInputData, map, reduce, summarize }

    });
