module.exports.TicketSystem = function (config) {
	var tickets = {};

	return {
		getNewTicket: function (id) {
			var _status = 'new';
			var _time = (new Date()).getTime();

			var ticket = {
				callback: false,
				data: {},
				getStatus: function () { return _status },
				getAge: function () { return (new Date()).getTime() - _time },
				updateStatus: function (msg) {
					_status = msg;

					if (ticket.callback) {
						ticket.respond(ticket.callback);
						ticket.callback = false;
					}
				},
				respond: function (callback) {
					callback({
						id:id,
						status:_status,
						data:ticket.data
					})
				}
			}

			tickets[id] = ticket;

			return ticket;
		},
		getTicket: function (id) {
			var ticket = tickets[id];
			if (!ticket) return false;
			if ((ticket.getStatus() == 'error') && (ticket.getAge() > config.minAge)) return false;
			if (ticket.getAge() > config.maxAge) return false;
			return ticket;
		}
	}
}