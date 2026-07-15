// Client Portal & Data Rooms — Named Formulas
nfPortalEnabledClients = Filter(Clients, PortalEnabled = true);
nfDataRoomsExternalBlocked = Filter(DataRooms, ExternalAccessAllowed = false && ExternalSharingMode = "Disabled");
nfDataRoomsStaging = Filter(DataRooms, Status = "Draft" || Status = "Staging");
nfUnpublishedStatusUpdates = Filter(PortalStatusUpdates, IsPublished = false);
// NEVER email or share externally from canvas formulas.
