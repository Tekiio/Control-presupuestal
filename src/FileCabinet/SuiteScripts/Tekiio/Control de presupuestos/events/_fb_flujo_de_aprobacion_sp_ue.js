/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
* @name FB - Flujo de aprobacion SolPed - UE
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Script que realiza el flujo de aprobacion, ademas indica si ocurre algun detalle en algun paso 
* @copyright Tekiio México 2022
* 
* Konfio       -> Konfio
* Last modification  -> 29/08/2023
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> FB - Flujo de aprobacion SolPed - UE <_fb_flujo_aprobacion_sp_ue>
*/
define(["N/log", "N/ui/serverWidget", "N/runtime", "N/ui/message", "N/search", 'N/record', 'N/url', 'N/email'], (log, serverWidget, runtime, message, search, record, url, email) => {
    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = (scriptContext) => {
        try {
            log.audit({ title: 'scriptContext', details: scriptContext });
            // Verifica el contexto en el que se trabajara
            let contexto = scriptContext.type;


            // Se llama al ClientScript el cual tiene toda la logica para la aprobación asi como los mensajes de aviso
            let obj = {}
            switch (contexto) {
                case scriptContext.UserEventType.VIEW:

                    // Se obtiene el registro actual y el formulario para visualizar los mensajes iniciales
                    let currentForm = scriptContext.form;
                    let recordNew = scriptContext.newRecord;
                    currentForm.clientScriptModulePath = '../uievents/fb_flujo_de_aprobacion_sp_cs.js';


                    var scriptObj = runtime.getCurrentScript();
                    var rol = parseInt(scriptObj.getParameter({ name: 'custscript_fb_rol_approver_usage' }));
                    var rolComprador = parseInt(scriptObj.getParameter({ name: 'custscript_fb_rol_buyer_usage' }));
                    var rolGerenteComprador = parseInt(scriptObj.getParameter({ name: 'custscript_fb_rol_manager_buyer_usage' }));
                    log.audit({ title: 'rol', details: rol });
                    log.audit({ title: 'rolComprador', details: rolComprador });
                    log.audit({ title: 'rolGerenteComprador', details: rolGerenteComprador });
                    // Obtencion de datos necesarios para la validacion
                    let userObj = runtime.getCurrentUser();
                    let idRecord = recordNew.id;
                    let total = parseInt(recordNew.getValue({ fieldId: "total" }));
                    let typeTrand = recordNew.getValue({ fieldId: "type" });
                    let recordType = recordNew.type;
                    let idAprobador = parseInt(recordNew.getValue({ fieldId: "custbody_fb_aprobador_original" }));
                    let posAprobador = parseInt(recordNew.getValue({ fieldId: "custbody_fb_posicion_aprobadora" }));
                    let status = parseInt(recordNew.getValue({ fieldId: "approvalstatus" }));
                    let departamento = parseInt(recordNew.getValue({ fieldId: "department" }));
                    let idGrupoAprobacion1 = recordNew.getValue({ fieldId: "custbody_fb_group_approver_into_body" });
                    var idGrupoAprobacion2 = search.lookupFields({ type: 'department', id: departamento, columns: ['custrecord_fb_dept_group_approve'] }).custrecord_fb_dept_group_approve[0].value || null;
                    let isCenterCost = recordNew.getValue({ fieldId: 'custbody_fb_multi_centros' })
                    var idGrupoAprobacion = ((!isCenterCost) ? (idGrupoAprobacion1 || idGrupoAprobacion2) : idGrupoAprobacion1);
                    log.audit({ title: 'userObj', details: userObj });
                    log.audit({ title: 'Rol User', details: { tipo: typeof userObj.role, valor: userObj.role } });
                    log.audit({ title: 'Rol rolComprador', details: { tipo: typeof rolComprador, valor: rolComprador } });
                    log.audit({ title: 'Rol rol', details: { tipo: typeof rol, valor: rol } });
                    log.audit({ title: 'idAprobador', details: typeof idAprobador });
                    log.audit({ title: 'status', details: status });
                    log.audit({ title: 'typeTrand', details: typeTrand });
                    log.audit({ title: 'recordType', details: recordType });
                    // Verifica si el aprobador coincide con el que desea realizar la aprobacion ademas si la transaccion esta pendiente de aprobar
                    // if (status === 1 && recordType === 'purchaserequisition' && !isCenterCost && idGrupoAprobacion) {
                    // if (status === 1 && idAprobador === userObj.id && recordType === 'purchaserequisition' && !isCenterCost && idGrupoAprobacion && (rol === parseInt(userObj.role) || parseInt(userObj.role) === 1035)) {
                    if (status === 1 && idAprobador === userObj.id && recordType === 'purchaserequisition' && !isCenterCost && idGrupoAprobacion) {
                        obj.option = 'PENDING_TO_APPROVE';
                        obj.status = status;
                        showMessageInitial(currentForm, obj)
                        let aprobador = {
                            id: idAprobador,
                            posicion: posAprobador
                        }
                        aprobador = JSON.stringify(aprobador)
                        currentForm.addButton({ id: 'custpage_approval_button', label: 'Aprobación', functionName: 'solicitaAprobacion(' + idRecord + ',' + total + ',' + idGrupoAprobacion + ',' + aprobador + ',"' + recordType + '",' + true + ')' });
                        currentForm.addButton({ id: 'custpage_cancel_button', label: 'Cancelación', functionName: 'solicitaAprobacion(' + idRecord + ',' + total + ',' + idGrupoAprobacion + ',' + aprobador + ',"' + recordType + '",' + false + ')' });
                    }
                    // if (status === 1 && idAprobador === userObj.id && recordType === 'purchaserequisition' && isCenterCost && idGrupoAprobacion && (rol === parseInt(userObj.role) || parseInt(userObj.role) === 1035)) {
                    if (status === 1 && idAprobador === userObj.id && recordType === 'purchaserequisition' && isCenterCost && idGrupoAprobacion) {
                        // if (status === 1 && recordType === 'purchaserequisition' && isCenterCost && idGrupoAprobacion) {
                        obj.option = 'PENDING_TO_APPROVE';
                        obj.status = status;
                        showMessageInitial(currentForm, obj)
                        let aprobador = {
                            id: idAprobador,
                            posicion: posAprobador
                        }
                        aprobador = JSON.stringify(aprobador)
                        currentForm.addButton({ id: 'custpage_approval_multicentro_button', label: 'Aprobación multicentro', functionName: 'solicitaAprobacionMultiCentro(' + idRecord + ',' + total + ',' + idGrupoAprobacion + ',' + aprobador + ',"' + recordType + '",' + true + ')' });
                        currentForm.addButton({ id: 'custpage_cancel_multicentro_button', label: 'Cancelación multicentro', functionName: 'solicitaAprobacionMultiCentro(' + idRecord + ',' + total + ',' + idGrupoAprobacion + ',' + aprobador + ',"' + recordType + '",' + false + ')' });
                    }
                    // if (status === 1 && recordType === 'purchaserequisition' && isCenterCost && !idGrupoAprobacion && rol ===userObj.role) {
                    if (status === 1 && recordType === 'purchaserequisition' && isCenterCost && !idGrupoAprobacion) {
                        currentForm.addButton({ id: 'custpage_assign_group_button', label: 'Asigna grupo de aprobación', functionName: 'createGroupApprover(' + idRecord + ',"' + recordType + '")' });
                    }
                    // Si el rol es distinto de comprador, quitara el boton de crear orden de compra
                    if (rolComprador !== parseInt(userObj.role) && rolGerenteComprador !== parseInt(userObj.role) && 3 !== parseInt(userObj.role)) {
                        currentForm.removeButton({ id: 'createpo' });
                    }
                    break;
                case scriptContext.UserEventType.CREATE:
                case scriptContext.UserEventType.EDIT:

                    let form = scriptContext.form;
                    var sublistObj = form.getSublist({ id: 'item' });
                    log.audit({ title: 'sublistId', details: sublistObj });
                    var field = sublistObj.getField({ id: 'estimatedamount' });

                    field.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                    break;
            }
        } catch (e) {
            log.error({ title: 'Error beforeScript:', details: e });
        }

    }

    function showMessageInitial(form, obj) {
        try {

            let objMessage = { type: '', message: ' ', duration: 5500 }
            switch (obj.option) {
                case "PENDING_TO_APPROVE":
                    objMessage.type = message.Type.INFORMATION
                    objMessage.message = 'Transaccion pendiente por aprobar.'
                    break;
                default:
                    objMessage.type = message.Type.INFORMATION
                    objMessage.message = 'Mensaje no configurado, notifique a su administrador de la incidencia.'
                    break;
            }
            var messageObj = message.create(objMessage);
            form.addPageInitMessage({ message: messageObj });
        } catch (e) {
            log.error({ title: 'Error showMessageInitial:', details: e });
        }
    }

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const afterSubmit = (scriptContext) => {
        try {
            log.debug({ title: 'scriptContext', details: scriptContext });
        } catch (e) {
            log.error({ title: 'Error afterSubmit:', details: e });
        }

    }

    return { beforeLoad, afterSubmit }

});
